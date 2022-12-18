let unique = false

function id_check() {
	const xhr = new XMLHttpRequest()
	xhr.open('GET', '/account/idcheck/' + new FormData(document.querySelector('form')).get('id'))
	xhr.send()
	xhr.onreadystatechange = () => {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				unique = JSON.parse(xhr.response).unique

				if (unique) alert('사용 가능한 ID입니다.')
				else alert('이미 사용중인 ID입니다.')
			} else if (xhr.status === 500) {
				alert('서버에서 오류가 발생했습니다.')
				console.error(xhr.response)
			}
		}
	}
}

function check() {
	const form_data = new FormData(document.querySelector('form'))

	if (!unique) alert('ID 중복확인을 해 주세요.')
	else if (form_data.get('password') !== form_data.get('confirm-password')) alert('비밀번호가 일치하지 않습니다.')
	else return true

	return false
}
