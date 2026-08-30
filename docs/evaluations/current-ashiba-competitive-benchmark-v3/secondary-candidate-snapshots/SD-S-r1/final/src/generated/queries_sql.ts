import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const listTicketsByIdAscQuery = `-- name: ListTicketsByIdAsc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::boolean = FALSE OR assignee IS NOT DISTINCT FROM $3::text)
ORDER BY id ASC
OFFSET $4::integer LIMIT $5::integer`;

export interface ListTicketsByIdAscArgs {
    statusFilter: string | null;
    assigneeIsFiltered: boolean;
    assigneeFilter: string | null;
    offsetValue: number;
    limitValue: number;
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
        values: [args.statusFilter, args.assigneeIsFiltered, args.assigneeFilter, args.offsetValue, args.limitValue],
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
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::boolean = FALSE OR assignee IS NOT DISTINCT FROM $3::text)
ORDER BY id DESC
OFFSET $4::integer LIMIT $5::integer`;

export interface ListTicketsByIdDescArgs {
    statusFilter: string | null;
    assigneeIsFiltered: boolean;
    assigneeFilter: string | null;
    offsetValue: number;
    limitValue: number;
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
        values: [args.statusFilter, args.assigneeIsFiltered, args.assigneeFilter, args.offsetValue, args.limitValue],
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
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::boolean = FALSE OR assignee IS NOT DISTINCT FROM $3::text)
ORDER BY priority ASC, id ASC
OFFSET $4::integer LIMIT $5::integer`;

export interface ListTicketsByPriorityAscArgs {
    statusFilter: string | null;
    assigneeIsFiltered: boolean;
    assigneeFilter: string | null;
    offsetValue: number;
    limitValue: number;
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
        values: [args.statusFilter, args.assigneeIsFiltered, args.assigneeFilter, args.offsetValue, args.limitValue],
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
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::boolean = FALSE OR assignee IS NOT DISTINCT FROM $3::text)
ORDER BY priority DESC, id ASC
OFFSET $4::integer LIMIT $5::integer`;

export interface ListTicketsByPriorityDescArgs {
    statusFilter: string | null;
    assigneeIsFiltered: boolean;
    assigneeFilter: string | null;
    offsetValue: number;
    limitValue: number;
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
        values: [args.statusFilter, args.assigneeIsFiltered, args.assigneeFilter, args.offsetValue, args.limitValue],
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
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::boolean = FALSE OR assignee IS NOT DISTINCT FROM $3::text)
ORDER BY created_at ASC, id ASC
OFFSET $4::integer LIMIT $5::integer`;

export interface ListTicketsByCreatedAtAscArgs {
    statusFilter: string | null;
    assigneeIsFiltered: boolean;
    assigneeFilter: string | null;
    offsetValue: number;
    limitValue: number;
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
        values: [args.statusFilter, args.assigneeIsFiltered, args.assigneeFilter, args.offsetValue, args.limitValue],
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
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::boolean = FALSE OR assignee IS NOT DISTINCT FROM $3::text)
ORDER BY created_at DESC, id ASC
OFFSET $4::integer LIMIT $5::integer`;

export interface ListTicketsByCreatedAtDescArgs {
    statusFilter: string | null;
    assigneeIsFiltered: boolean;
    assigneeFilter: string | null;
    offsetValue: number;
    limitValue: number;
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
        values: [args.statusFilter, args.assigneeIsFiltered, args.assigneeFilter, args.offsetValue, args.limitValue],
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
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE id = $1::bigint`;

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
VALUES ($1::text, $2::ticket_status, $3::text, $4::integer, CURRENT_TIMESTAMP, $5::jsonb)
RETURNING id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata`;

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

export const updateTicketAssigneeQuery = `-- name: UpdateTicketAssignee :one
UPDATE tickets
SET assignee = $1::text
WHERE id = $2::bigint
RETURNING id::text AS id, assignee`;

export interface UpdateTicketAssigneeArgs {
    assignee: string | null;
    id: string;
}

export interface UpdateTicketAssigneeRow {
    id: string;
    assignee: string | null;
}

export async function updateTicketAssignee(client: Client, args: UpdateTicketAssigneeArgs): Promise<UpdateTicketAssigneeRow | null> {
    const result = await client.query({
        text: updateTicketAssigneeQuery,
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

export const insertTicketAssignAuditQuery = `-- name: InsertTicketAssignAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES ($1::bigint, 'assign', json_build_object('assignee', $2::text)::text, CURRENT_TIMESTAMP)`;

export interface InsertTicketAssignAuditArgs {
    ticketId: string;
    assignee: string | null;
}

export async function insertTicketAssignAudit(client: Client, args: InsertTicketAssignAuditArgs): Promise<void> {
    await client.query({
        text: insertTicketAssignAuditQuery,
        values: [args.ticketId, args.assignee],
        rowMode: "array"
    });
}

