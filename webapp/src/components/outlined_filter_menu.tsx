// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';

import './outlined_filter_menu.scss';

export type OutlinedFilterMenuItem = {
    id: string;
    label: React.ReactNode;
    sublabel?: React.ReactNode;
    disabled?: boolean;

    /** Checkbox leading icon state (Columns-style). */
    checked?: boolean;

    /** Trailing checkmark (Duration-style selected item). */
    selected?: boolean;
    onClick?: () => void;
};

type Props = {
    label: string;
    value: string;
    ariaLabel: string;
    menuAriaLabel: string;
    disabled?: boolean;
    menuWidth?: number;
    wide?: boolean;
    items: OutlinedFilterMenuItem[];

    /** Optional footer note under a separator (Duration-style). */
    footer?: React.ReactNode;
};

/**
 * Floating-label filter control matching System Console Users
 * (Duration / Columns): Input fieldset + chevron + popup menu.
 * Reuses Mattermost Input_* classes already present in System Console CSS.
 */
export default function OutlinedFilterMenu(props: Props) {
    // Mattermost provides React as an external; 10.11 does not have useId.
    const inputIdRef = useRef(`academy-filter-${props.label.replace(/\s+/g, '-').toLowerCase()}`);
    const inputId = inputIdRef.current;
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onDocMouseDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onDocMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const toggle = () => {
        if (props.disabled) {
            return;
        }
        setOpen((v) => !v);
    };

    return (
        <div
            ref={rootRef}
            className={`AcademyOutlinedFilter${props.disabled ? ' is-disabled' : ''}${open ? ' is-open' : ''}`}
        >
            <div
                className={`inputWithMenu${props.wide ? ' inputWithMenu--wide' : ''}`}
                role='button'
                tabIndex={props.disabled ? -1 : 0}
                aria-haspopup='menu'
                aria-expanded={open}
                aria-label={props.ariaLabel}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
            >
                <div className={`Input_container${props.disabled ? ' disabled' : ''}`}>
                    <div className='Input_fieldset Input_fieldset___legend'>
                        <label
                            htmlFor={inputId}
                            className='Input_legend Input_legend___focus'
                        >
                            {props.label}
                        </label>
                        <div className='Input_wrapper'>
                            <input
                                id={inputId}
                                className='Input form-control Input__focus'
                                name={props.label}
                                value={props.value}
                                readOnly={true}
                                disabled={props.disabled}
                                tabIndex={-1}
                                onChange={() => undefined}
                            />
                            <i className='icon icon-chevron-down'/>
                        </div>
                    </div>
                </div>
            </div>

            {open && (
                <div
                    className='AcademyOutlinedFilter__menu'
                    role='menu'
                    aria-label={props.menuAriaLabel}
                    style={props.menuWidth ? {width: props.menuWidth} : undefined}
                >
                    {props.items.map((item) => {
                        const leading = typeof item.checked === 'boolean' ? (
                            <i
                                className={`icon ${item.checked ? 'icon-checkbox-marked' : 'icon-checkbox-blank-outline'}`}
                            />
                        ) : null;

                        const trailing = item.selected ? (
                            <i className='icon icon-check'/>
                        ) : null;

                        return (
                            <button
                                key={item.id}
                                type='button'
                                role={typeof item.checked === 'boolean' ? 'menuitemcheckbox' : 'menuitem'}
                                aria-checked={typeof item.checked === 'boolean' ? item.checked : undefined}
                                className={`AcademyOutlinedFilter__item${item.disabled ? ' is-disabled' : ''}${item.selected ? ' is-selected' : ''}`}
                                disabled={item.disabled || props.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.disabled) {
                                        return;
                                    }
                                    item.onClick?.();

                                    // Keep multi-select menus open; close single-select after pick.
                                    if (typeof item.checked !== 'boolean') {
                                        setOpen(false);
                                    }
                                }}
                            >
                                {leading && (
                                    <span className='AcademyOutlinedFilter__leading'>{leading}</span>
                                )}
                                <span className='AcademyOutlinedFilter__labels'>
                                    <span className='AcademyOutlinedFilter__label'>{item.label}</span>
                                    {item.sublabel && (
                                        <span className='AcademyOutlinedFilter__sublabel'>{item.sublabel}</span>
                                    )}
                                </span>
                                {trailing && (
                                    <span className='AcademyOutlinedFilter__trailing'>{trailing}</span>
                                )}
                            </button>
                        );
                    })}

                    {props.footer && (
                        <>
                            <div
                                className='AcademyOutlinedFilter__separator'
                                role='separator'
                            />
                            <div className='AcademyOutlinedFilter__footer'>
                                {props.footer}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
