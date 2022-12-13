import { Router } from 'express'
import { Account } from '../database.mjs'

const router = Router()

router.use('/', (req, res, next) => {
	// 로그인이 안 되어 있으면 로그인 페이지로
	if (!req.session.user) res.redirect('/account/login')
	else next()
})

// 친구 요청 보내기
router.get('/request/:id', (req, res) =>
	Account.friend_request(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

// 친구 요청 수락
router.get('/accept/:id', (req, res) =>
	Account.accept_request(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

// 친구 요청 거절
router.get('/decline/:id', (req, res) =>
	Account.decline_request(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

// 친구 삭제
router.get('/remove/:id', (req, res) =>
	Account.remove_friend(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

export default router
