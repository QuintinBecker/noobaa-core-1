/* Copyright (C) 2016 NooBaa */

import {
    OPEN_DRAWER,
    CLOSE_DRAWER,
    HIDE_NOTIFICATION,
    SHOW_NOTIFICATION
} from 'action-types';

// -------------------------------
// Drawer action creators
// -------------------------------
export function openAuditDrawer() {
    return {
        type: OPEN_DRAWER,
        payload: { pane: 'audit-pane' }
    };
}

export function openAlertsDrawer() {
    return {
        type: OPEN_DRAWER,
        payload: { pane: 'alerts-pane' }
    };
}

export function closeDrawer() {
    return { type: CLOSE_DRAWER };
}

// -------------------------------
// Notificaitons action creators
// -------------------------------
export function hideNotification(id) {
    return {
        type: HIDE_NOTIFICATION,
        payload: { id }
    };
}

export function showNotification(message, severity = 'info') {
    return {
        type: SHOW_NOTIFICATION,
        payload: { message, severity }
    };
}


