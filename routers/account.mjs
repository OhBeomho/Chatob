import { Router } from 'express'
import { Account } from '../database.mjs'

const router = Router()

// 로그인
router
	.route('/login')
	.get((_, res) => res.render('login.html'))
	.post((req, res) => {
		const { id, password } = req.body

		Account.login(id, password)
			.then(() => {
				req.session.user = id
				res.redirect('/')
			})
			.catch((err) => res.render('error', { err }))
	})

// 회원가입
router
	.route('/signup')
	.get((_, res) => res.render('signup.html'))
	.post((req, res) => {
		const { id, password } = req.body

		Account.sign_up(id, password)
			.then(() => res.redirect('/account/login'))
			.catch((err) => res.render('error', { err }))
	})

// ID 중복확인
router.get('/idcheck/:id', (req, res) =>
	Account.id_check(req.params.id)
		.then((unique) => res.send({ unique }))
		.catch((err) => res.status(500).send(err))
)

// 로그아웃
router.get('/logout', (req, res) => {
	if (req.session.user) req.session.destroy()

	res.redirect('/')
})

export default router
