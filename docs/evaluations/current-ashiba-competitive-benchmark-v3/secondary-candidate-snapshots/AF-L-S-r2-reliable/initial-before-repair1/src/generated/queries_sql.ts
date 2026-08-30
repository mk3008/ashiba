import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const listTicketsByIdAscQuery = `-- name: ListTicketsByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::text = '' OR status::text = $1::text)
  AND ($2::integer = 0
       OR ($2::integer = 1 AND assignee IS NULL)
       OR ($2::integer = 2 AND assignee = $3::text))
ORDER BY id ASC
LIMIT $5 OFFSET $4`;

export interface ListTicketsByIdAscArgs {
    statusFilter: string;
    assigneeMode: number;
    assigneeValue: string;
    offsetCount: string;
    limitCount: string;
}

export interface ListTicketsByIdAscRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listTicketsByIdAsc(client: Client, args: ListTicketsByIdAscArgs): Promise<ListTicketsByIdAscRow[]> {
    const result = await client.query({
        text: listTicketsByIdAscQuery,
        values: [args.statusFilter, args.assigneeMode, args.assigneeValue, args.offsetCount, args.limitCount],
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

export const listTicketsByIdDescQuery = `-- name: ListTicketsByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::text = '' OR status::text = $1::text)
  AND ($2::integer = 0
       OR ($2::integer = 1 AND assignee IS NULL)
       OR ($2::integer = 2 AND assignee = $3::text))
ORDER BY id DESC
LIMIT $5 OFFSET $4`;

export interface ListTicketsByIdDescArgs {
    statusFilter: string;
    assigneeMode: number;
    assigneeValue: string;
    offsetCount: string;
    limitCount: string;
}

export interface ListTicketsByIdDescRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listTicketsByIdDesc(client: Client, args: ListTicketsByIdDescArgs): Promise<ListTicketsByIdDescRow[]> {
    const result = await client.query({
        text: listTicketsByIdDescQuery,
        values: [args.statusFilter, args.assigneeMode, args.assigneeValue, args.offsetCount, args.limitCount],
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

export const listTicketsByPriorityAscQuery = `-- name: ListTicketsByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::text = '' OR status::text = $1::text)
  AND ($2::integer = 0
       OR ($2::integer = 1 AND assignee IS NULL)
       OR ($2::integer = 2 AND assignee = $3::text))
ORDER BY priority ASC, id ASC
LIMIT $5 OFFSET $4`;

export interface ListTicketsByPriorityAscArgs {
    statusFilter: string;
    assigneeMode: number;
    assigneeValue: string;
    offsetCount: string;
    limitCount: string;
}

export interface ListTicketsByPriorityAscRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listTicketsByPriorityAsc(client: Client, args: ListTicketsByPriorityAscArgs): Promise<ListTicketsByPriorityAscRow[]> {
    const result = await client.query({
        text: listTicketsByPriorityAscQuery,
        values: [args.statusFilter, args.assigneeMode, args.assigneeValue, args.offsetCount, args.limitCount],
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

export const listTicketsByPriorityDescQuery = `-- name: ListTicketsByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::text = '' OR status::text = $1::text)
  AND ($2::integer = 0
       OR ($2::integer = 1 AND assignee IS NULL)
       OR ($2::integer = 2 AND assignee = $3::text))
ORDER BY priority DESC, id ASC
LIMIT $5 OFFSET $4`;

export interface ListTicketsByPriorityDescArgs {
    statusFilter: string;
    assigneeMode: number;
    assigneeValue: string;
    offsetCount: string;
    limitCount: string;
}

export interface ListTicketsByPriorityDescRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listTicketsByPriorityDesc(client: Client, args: ListTicketsByPriorityDescArgs): Promise<ListTicketsByPriorityDescRow[]> {
    const result = await client.query({
        text: listTicketsByPriorityDescQuery,
        values: [args.statusFilter, args.assigneeMode, args.assigneeValue, args.offsetCount, args.limitCount],
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

export const listTicketsByCreatedAtAscQuery = `-- name: ListTicketsByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::text = '' OR status::text = $1::text)
  AND ($2::integer = 0
       OR ($2::integer = 1 AND assignee IS NULL)
       OR ($2::integer = 2 AND assignee = $3::text))
ORDER BY created_at ASC, id ASC
LIMIT $5 OFFSET $4`;

export interface ListTicketsByCreatedAtAscArgs {
    statusFilter: string;
    assigneeMode: number;
    assigneeValue: string;
    offsetCount: string;
    limitCount: string;
}

export interface ListTicketsByCreatedAtAscRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listTicketsByCreatedAtAsc(client: Client, args: ListTicketsByCreatedAtAscArgs): Promise<ListTicketsByCreatedAtAscRow[]> {
    const result = await client.query({
        text: listTicketsByCreatedAtAscQuery,
        values: [args.statusFilter, args.assigneeMode, args.assigneeValue, args.offsetCount, args.limitCount],
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

export const listTicketsByCreatedAtDescQuery = `-- name: ListTicketsByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::text = '' OR status::text = $1::text)
  AND ($2::integer = 0
       OR ($2::integer = 1 AND assignee IS NULL)
       OR ($2::integer = 2 AND assignee = $3::text))
ORDER BY created_at DESC, id ASC
LIMIT $5 OFFSET $4`;

export interface ListTicketsByCreatedAtDescArgs {
    statusFilter: string;
    assigneeMode: number;
    assigneeValue: string;
    offsetCount: string;
    limitCount: string;
}

export interface ListTicketsByCreatedAtDescRow {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    priority: number;
    createdAt: Date;
    metadata: any;
}

export async function listTicketsByCreatedAtDesc(client: Client, args: ListTicketsByCreatedAtDescArgs): Promise<ListTicketsByCreatedAtDescRow[]> {
    const result = await client.query({
        text: listTicketsByCreatedAtDescQuery,
        values: [args.statusFilter, args.assigneeMode, args.assigneeValue, args.offsetCount, args.limitCount],
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
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE id = $1`;

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
    status: string;
    assignee: string | null;
    priority: number;
    metadata: any;
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
        values: [args.title, args.status, args.assignee, args.priority, args.metadata],
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

export const assignTicketQuery = `-- name: AssignTicket :one
UPDATE tickets
SET assignee = $1
WHERE id = $2
RETURNING id, assignee`;

export interface AssignTicketArgs {
    assignee: string | null;
    id: string;
}

export interface AssignTicketRow {
    id: string;
    assignee: string | null;
}

export async function assignTicket(client: Client, args: AssignTicketArgs): Promise<AssignTicketRow | null> {
    const result = await client.query({
        text: assignTicketQuery,
        values: [args.assignee, args.id],
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
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES ($1, 'assigned', $2, NOW())`;

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

