import pg from 'pg'
import { config } from 'dotenv'

config()

const { DB_URL } = process.env
const { Client } = pg

const db = new Client(DB_URL)

try {
	await db.connect()
	await db.query(
		`CREATE TABLE IF NOT EXISTS account(
			id TEXT PRIMARY KEY,
			password TEXT NOT NULL,
			friends TEXT[] DEFAULT '{}',
			requests TEXT[] DEFAULT '{}'
		)`
	)

	console.log(`[${new Date().toLocaleTimeString('en-US')}] Database connected.`)
} catch (err) {
	console.error(err)
	process.exit(1)
}

export class Account {
	static async get(id) {
		return (await db.query('SELECT id, friends, requests FROM account WHERE id = $1', [id])).rows[0]
	}

	static async login(id, password) {
		const account = (await db.query('SELECT password FROM account WHERE id = $1', [id])).rows[0]

		if (!account) throw new Error('존재하지 않는 계정입니다.')
		else if (account.password !== password) throw new Error('비밀번호가 일치하지 않습니다.')
	}

	static async sign_up(id, password) {
		await db.query('INSERT INTO account(id, password) VALUES($1, $2)', [id, password])
	}

	static async id_check(id) {
		return !(await db.query('SELECT EXISTS(SELECT * FROM account WHERE id = $1)', [id])).rows[0].exists
	}

	static async friend_request(from_id, to_id) {
		await db.query('UPDATE account SET requests = ARRAY_APPEND(requests, $1) WHERE id = $2', [from_id, to_id])
	}

	static async accept_request(id, request_id) {
		await db.query('UPDATE account SET requests = ARRAY_REMOVE(requests, $1) WHERE id = $2', [request_id, id])
		await Account.#add_friend(id, request_id)
	}

	static async decline_request(id, request_id) {
		await db.query('UPDATE account SET requests = ARRAY_REMOVE(requests, $1) WHERE id = $2', [request_id, id])
	}

	static async #add_friend(id_1, id_2) {
		const sql = 'UPDATE account SET friends = ARRAY_APPEND(friends, $1) WHERE id = $2'
		await db.query(sql, [id_1, id_2])
		await db.query(sql, [id_2, id_1])
	}

	static async remove_friend(id_1, id_2) {
		const sql = 'UPDATE account SET friends = ARRAY_REMOVE(friends, $1) WHERE id = $2'
		await db.query(sql, [id_1, id_2])
		await db.query(sql, [id_2, id_1])
	}
}
