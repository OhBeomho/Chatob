import { Router } from 'express'
import { Account } from '../database.mjs'

const router = Router()

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

router
	.route('/signup')
	.get((_, res) => res.render('signup.html'))
	.post((req, res) => {
		const { id, password } = req.body

		if (id.length < 3 || id.length > 20) res.render('error', { err: 'ID는 3자 이상 20자 이하여야 합니다.' })
		else if (password.length < 4) res.render('error', { err: '비밀번호는 4자 이상이여야 합니다.' })

		Account.sign_up(id, password)
			.then(() => res.redirect('/account/login'))
			.catch((err) => res.render('error', { err }))
	})

router.get('/idcheck/:id', (req, res) =>
	Account.id_check(req.params.id)
		.then((unique) => res.send({ unique }))
		.catch((err) => res.status(500).send(err))
)

router.get('/logout', (req, res) => {
	if (req.session.user) req.session.destroy()

	res.redirect('/')
})

export default router
