import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const listByIdAscQuery = `-- name: ListByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY id ASC LIMIT $3 OFFSET $4`;

export interface ListByIdAscArgs {
    : string;
    : string;
    limit: string;
    offset: string;
}

export interface ListByIdAscRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listByIdAsc(client: Client, args: ListByIdAscArgs): Promise<ListByIdAscRow[]> {
    const result = await client.query({
        text: listByIdAscQuery,
        values: [args., args., args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            title: row[1],
            status: row[2],
            assignee: row[3],
            priority: row[4],
            createdAt: row[5],
            metadata: row[6]
        };
    });
}

export const listByIdDescQuery = `-- name: ListByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY id DESC LIMIT $3 OFFSET $4`;

export interface ListByIdDescArgs {
    : string;
    : string;
    limit: string;
    offset: string;
}

export interface ListByIdDescRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listByIdDesc(client: Client, args: ListByIdDescArgs): Promise<ListByIdDescRow[]> {
    const result = await client.query({
        text: listByIdDescQuery,
        values: [args., args., args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            title: row[1],
            status: row[2],
            assignee: row[3],
            priority: row[4],
            createdAt: row[5],
            metadata: row[6]
        };
    });
}

export const listByPriorityAscQuery = `-- name: ListByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY priority ASC, id ASC LIMIT $3 OFFSET $4`;

export interface ListByPriorityAscArgs {
    : string;
    : string;
    limit: string;
    offset: string;
}

export interface ListByPriorityAscRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listByPriorityAsc(client: Client, args: ListByPriorityAscArgs): Promise<ListByPriorityAscRow[]> {
    const result = await client.query({
        text: listByPriorityAscQuery,
        values: [args., args., args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            title: row[1],
            status: row[2],
            assignee: row[3],
            priority: row[4],
            createdAt: row[5],
            metadata: row[6]
        };
    });
}

export const listByPriorityDescQuery = `-- name: ListByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY priority DESC, id ASC LIMIT $3 OFFSET $4`;

export interface ListByPriorityDescArgs {
    : string;
    : string;
    limit: string;
    offset: string;
}

export interface ListByPriorityDescRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listByPriorityDesc(client: Client, args: ListByPriorityDescArgs): Promise<ListByPriorityDescRow[]> {
    const result = await client.query({
        text: listByPriorityDescQuery,
        values: [args., args., args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            title: row[1],
            status: row[2],
            assignee: row[3],
            priority: row[4],
            createdAt: row[5],
            metadata: row[6]
        };
    });
}

export const listByCreatedAtAscQuery = `-- name: ListByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY created_at ASC, id ASC LIMIT $3 OFFSET $4`;

export interface ListByCreatedAtAscArgs {
    : string;
    : string;
    limit: string;
    offset: string;
}

export interface ListByCreatedAtAscRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listByCreatedAtAsc(client: Client, args: ListByCreatedAtAscArgs): Promise<ListByCreatedAtAscRow[]> {
    const result = await client.query({
        text: listByCreatedAtAscQuery,
        values: [args., args., args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            title: row[1],
            status: row[2],
            assignee: row[3],
            priority: row[4],
            createdAt: row[5],
            metadata: row[6]
        };
    });
}

export const listByCreatedAtDescQuery = `-- name: ListByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY created_at DESC, id ASC LIMIT $3 OFFSET $4`;

export interface ListByCreatedAtDescArgs {
    : string;
    : string;
    limit: string;
    offset: string;
}

export interface ListByCreatedAtDescRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listByCreatedAtDesc(client: Client, args: ListByCreatedAtDescArgs): Promise<ListByCreatedAtDescRow[]> {
    const result = await client.query({
        text: listByCreatedAtDescQuery,
        values: [args., args., args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            title: row[1],
            status: row[2],
            assignee: row[3],
            priority: row[4],
            createdAt: row[5],
            metadata: row[6]
        };
    });
}

export const getTicketQuery = `-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets WHERE id = $1 LIMIT 1`;

export interface GetTicketArgs {
    id: string;
}

export interface GetTicketRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function getTicket(client: Client, args: GetTicketArgs): Promise<GetTicketRow | null> {
    const result = await client.query({
        text: getTicketQuery,
        values: [args.id],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        title: row[1],
        status: row[2],
        assignee: row[3],
        priority: row[4],
        createdAt: row[5],
        metadata: row[6]
    };
}

export const createTicketQuery = `-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES ($1, $2::ticket_status, $3, $4, NOW(), $5::jsonb)
RETURNING id, title, status, assignee, priority, created_at, metadata`;

export interface CreateTicketArgs {
    title: string;
    : string;
    assignee: string | null;
    priority: number;
    : any;
}

export interface CreateTicketRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function createTicket(client: Client, args: CreateTicketArgs): Promise<CreateTicketRow | null> {
    const result = await client.query({
        text: createTicketQuery,
        values: [args.title, args., args.assignee, args.priority, args.],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        title: row[1],
        status: row[2],
        assignee: row[3],
        priority: row[4],
        createdAt: row[5],
        metadata: row[6]
    };
}

export const updateTicketAssigneeQuery = `-- name: UpdateTicketAssignee :one
UPDATE tickets SET assignee = $2 WHERE id = $1 RETURNING id, assignee`;

export interface UpdateTicketAssigneeArgs {
    id: string;
    assignee: string | null;
}

export interface UpdateTicketAssigneeRow {
    id: string;
    assignee: string | null;
}

export async function updateTicketAssignee(client: Client, args: UpdateTicketAssigneeArgs): Promise<UpdateTicketAssigneeRow | null> {
    const result = await client.query({
        text: updateTicketAssigneeQuery,
        values: [args.id, args.assignee],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        assignee: row[1]
    };
}

export const insertTicketAuditQuery = `-- name: InsertTicketAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1, 'assigned', $2, NOW())`;

export interface InsertTicketAuditArgs {
    ticketId: string;
    detail: string;
}

export async function insertTicketAudit(client: Client, args: InsertTicketAuditArgs): Promise<void> {
    await client.query({
        text: insertTicketAuditQuery,
        values: [args.ticketId, args.detail],
        rowMode: "array"
    });
}

