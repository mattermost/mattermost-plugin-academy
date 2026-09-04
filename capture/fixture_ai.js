// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * A stand-in LLM for the Agents shots.
 *
 * Pointing Agents at a local stub means captures need no API key, no network and no bill, but
 * the real reason is reproducibility: a live model returns different prose on every call, and a
 * screenshot of that can never be re-captured. Fixed replies make the art regenerable.
 *
 * **It speaks the Responses API, not Chat Completions.** Agents 2.7.0 posts to
 * `/v1/responses` with `Accept: text/event-stream` and a body of
 * `{model, max_output_tokens, stream, input, tools}`, and separately asks
 * `/v1/responses/input_tokens` to size a prompt. A stub that only implements
 * `/v1/chat/completions` is never called at all, and the agent answers "Sorry! The LLM did not
 * return a result." — which looks like a broken model rather than a wrong endpoint. Chat
 * Completions is still handled below for older plugin versions.
 *
 * Replies are chosen by matching the prompt, so a summarise request and a rewrite request
 * produce sensibly different — but fixed — answers.
 *
 * Some of the plugin's surfaces are **structured-output** callers rather than chat ones. The
 * composer's Rewrite actions send a system prompt that says "You are a JSON API" and name the
 * property they will parse, then reject anything else with "Failed to parse rewrite response
 * from AI." A prose reply is not a wrong answer there, it is a protocol error — so the stub
 * reads the requested property name back out of the prompt and wraps its reply in it.
 */

import http from 'node:http';

export const MOCK_PORT = 8099;
export const MOCK_MODEL = 'academy-capture-1';

/** First match wins, so specific patterns must precede the catch-all. */
const REPLIES = [
    {
        match: /summar/i,
        text: 'Maya reported that the staging deployment failed, and Jordan has a deploy checklist ' +
            'ready for review. They agreed to hold the release until the smoke tests pass, and the ' +
            'rollback plan now needs a database snapshot taken first — about four minutes, owned by ' +
            'on-call.',
    },
    {
        match: /rewrit|improve this writing|shorten|elaborate|simplif|spelling and grammar|professional|reword|tone/i,
        text: 'Two notes on the new empty state: the illustration competes with the ' +
            'primary action, and the supporting copy repeats the heading.',
    },
    {
        match: /rollback|deploy/i,
        text: 'The rollback runs in five steps: freeze deploys and announce it in Ops Bridge, take a ' +
            'database snapshot, run the smoke tests against staging, drain the job queue, then roll ' +
            'forward or run `make rollback`. On-call owns the snapshot and the rollback itself.',
    },
    {
        match: /.*/,
        text: 'Ops Bridge is where this team coordinates during incidents. The open thread covers a ' +
            'failed staging deployment, a deploy checklist awaiting review, and a rollback plan that ' +
            'needs a database snapshot taken first.',
    },
];

/**
 * Pulls the prompt text out of either API's request body.
 *
 * Responses sends `input`, which is either a bare string or an array of items whose `content` is
 * a list of parts. Chat Completions sends `messages`.
 */
function promptText(body) {
    const parts = [];

    const walk = (value) => {
        if (typeof value === 'string') {
            parts.push(value);
        } else if (Array.isArray(value)) {
            value.forEach(walk);
        } else if (value && typeof value === 'object') {
            if (typeof value.text === 'string') {
                parts.push(value.text);
            }
            if (value.content !== undefined) {
                walk(value.content);
            }
        }
    };

    walk(body?.input);
    walk(body?.messages);
    return parts.join(' ');
}

/**
 * The JSON property a structured-output caller will look for, if this is one.
 *
 * The prompt states the shape twice — once as `Return this exact format: {"name":"content"}` and
 * once as a JSON schema. Reading the schema's `required` list is the more precise of the two.
 */
function structuredProperty(prompt) {
    if (!/valid JSON|JSON API/i.test(prompt)) {
        return null;
    }
    const required = prompt.match(/"required":\s*\["([a-z_]+)"\]/i);
    if (required) {
        return required[1];
    }
    const inline = prompt.match(/exact format:\s*\{"([a-z_]+)"/i);
    return inline ? inline[1] : null;
}

function replyFor(body) {
    const prompt = promptText(body);
    const text = REPLIES.find((r) => r.match.test(prompt)).text;

    const property = structuredProperty(prompt);
    return property ? JSON.stringify({[property]: text}) : text;
}

const RESPONSE_ID = 'resp_academy_capture';
const ITEM_ID = 'msg_academy_capture';
const CREATED = 1700000000;

function responseObject(text, status) {
    return {
        id: RESPONSE_ID,
        object: 'response',
        created_at: CREATED,
        status,
        model: MOCK_MODEL,
        output: status === 'completed' ? [{
            id: ITEM_ID,
            type: 'message',
            status: 'completed',
            role: 'assistant',
            content: [{type: 'output_text', text, annotations: []}],
        }] : [],
        usage: {input_tokens: 64, output_tokens: 96, total_tokens: 160},
    };
}

/** Responses-API streaming, as a well-formed event sequence. */
function streamResponses(res, text) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    let sequence = 0;
    const send = (type, payload) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify({type, sequence_number: sequence++, ...payload})}\n\n`);
    };

    send('response.created', {response: responseObject('', 'in_progress')});
    send('response.in_progress', {response: responseObject('', 'in_progress')});
    send('response.output_item.added', {
        output_index: 0,
        item: {id: ITEM_ID, type: 'message', status: 'in_progress', role: 'assistant', content: []},
    });
    send('response.content_part.added', {
        item_id: ITEM_ID,
        output_index: 0,
        content_index: 0,
        part: {type: 'output_text', text: '', annotations: []},
    });

    // One delta rather than word by word. The shots wait for the reply to finish, so
    // drip-feeding adds wall-clock time and a chance of photographing half a sentence.
    send('response.output_text.delta', {item_id: ITEM_ID, output_index: 0, content_index: 0, delta: text});
    send('response.output_text.done', {item_id: ITEM_ID, output_index: 0, content_index: 0, text});
    send('response.content_part.done', {
        item_id: ITEM_ID,
        output_index: 0,
        content_index: 0,
        part: {type: 'output_text', text, annotations: []},
    });
    send('response.output_item.done', {
        output_index: 0,
        item: {
            id: ITEM_ID,
            type: 'message',
            status: 'completed',
            role: 'assistant',
            content: [{type: 'output_text', text, annotations: []}],
        },
    });
    send('response.completed', {response: responseObject(text, 'completed')});
    res.end();
}

/** Chat Completions streaming, kept for older plugin versions. */
function streamChatCompletions(res, text) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    const frame = (delta, finish = null) => `data: ${JSON.stringify({
        id: 'chatcmpl-academy-capture',
        object: 'chat.completion.chunk',
        created: CREATED,
        model: MOCK_MODEL,
        choices: [{index: 0, delta, finish_reason: finish}],
    })}\n\n`;

    res.write(frame({role: 'assistant', content: ''}));
    res.write(frame({content: text}));
    res.write(frame({}, 'stop'));
    res.write('data: [DONE]\n\n');
    res.end();
}

export function startMockLLM({port = MOCK_PORT, log = false} = {}) {
    const server = http.createServer((req, res) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let body = null;
            try {
                body = raw ? JSON.parse(raw) : null;
            } catch {
                body = null;
            }

            const url = req.url || '';
            const json = (payload) => {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(payload));
            };

            if (log) {
                console.log(`  mock: ${req.method} ${url}`);
                if (process.env.MOCK_DUMP && raw) {
                    console.log(raw.slice(0, 4000));
                }
            }

            // Prompt sizing, asked separately and never streamed.
            if (url.includes('/input_tokens')) {
                return json({input_tokens: 64});
            }

            if (url.includes('/models')) {
                return json({
                    object: 'list',
                    data: [{id: MOCK_MODEL, object: 'model', owned_by: 'academy-capture'}],
                });
            }

            const text = replyFor(body);
            const wantsStream = Boolean(body?.stream);

            if (url.includes('/responses')) {
                return wantsStream ? streamResponses(res, text) : json(responseObject(text, 'completed'));
            }

            if (!wantsStream) {
                return json({
                    id: 'chatcmpl-academy-capture',
                    object: 'chat.completion',
                    created: CREATED,
                    model: MOCK_MODEL,
                    choices: [{index: 0, message: {role: 'assistant', content: text}, finish_reason: 'stop'}],
                    usage: {prompt_tokens: 64, completion_tokens: 96, total_tokens: 160},
                });
            }
            return streamChatCompletions(res, text);
        });
    });

    return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => {
            resolve({
                url: `http://127.0.0.1:${port}/v1`,
                close: () => new Promise((done) => server.close(done)),
            });
        });
    });
}

/**
 * Config that points Agents at the stub.
 *
 * Kept for reference only: Agents 2.7.0 stores its service configuration in the plugin's own
 * store, so writing this through the Mattermost config API is silently ignored. Use
 * `setup_agents.mjs`, which drives the System Console form.
 */
export function agentsServiceConfig() {
    return {
        services: [{
            name: 'Academy capture stub',
            serviceName: 'openaicompatible',
            apiURL: `http://127.0.0.1:${MOCK_PORT}/v1`,
            apiKey: 'academy-capture',
            defaultModel: MOCK_MODEL,
            tokenLimit: 8000,
            streamingTimeoutSeconds: 30,
        }],
        allowPrivateChannels: true,
        enableLLMTrace: false,
    };
}
