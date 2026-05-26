<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sign Up — WTG Commuters Guide</title>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>
<div class="auth-page">
  <div class="auth-card">
    <div class="auth-logo">
       <a href="login.html"><h1 style="margin-top: -10px; margin-left: 350px; transform: scaleX(-1)">➦</h1></a>
      <img src="WTGLOGO2.png" alt="" width="250">
      <p>Create your account with us</p>
    </div>

    <div id="alert-area"></div>

    <div class="form-group">
      <label class="form-label" for="name">Full Name</label>
      <input class="form-control" type="text" id="name" placeholder="John Loyd Cruz" autocomplete="name"/>
    </div>
    <div class="form-group">
      <label class="form-label" for="email">Email Address</label>
      <input class="form-control" type="email" id="email" placeholder="ShainnaMagdayao@email.com" autocomplete="email"/>
    </div>
    <div class="form-group">
      <label class="form-label" for="password">Password</label>
      <input class="form-control" type="password" id="password" placeholder="At least 6 characters" autocomplete="new-password"/>
    </div>
    <div class="form-group">
      <label class="form-label" for="confirm">Confirm Password</label>
      <input class="form-control" type="password" id="confirm" placeholder="Repeat your password" autocomplete="new-password"/>
    </div>

    <button class="btn btn-primary btn-full btn-lg" id="signup-btn" onclick="doSignup()">
      Create Account
    </button>

    <div class="auth-divider"><span>or</span></div>

    <p class="text-center text-sm">
      Already have an account? <a href="login.html">Sign in</a>
    </p>
  </div>
</div>

<script src="auth.js"></script>
<script src="user.js"></script>
<script>
  if (AUTH.getSession()) window.location.href = 'index.html';

  function doSignup() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    const alertArea = document.getElementById('alert-area');
    const btn = document.getElementById('signup-btn');

    alertArea.innerHTML = '';

    if (password !== confirm) {
      alertArea.innerHTML = '<div class="alert alert-error">Passwords do not match.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    setTimeout(() => {
      const result = AUTH.signup(name, email, password);
      if (result.ok) {
        window.location.href = 'index.html';
      } else {
        alertArea.innerHTML = `<div class="alert alert-error">${result.msg}</div>`;
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    }, 400);
  }

  document.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });
</script>
</body>
</html>
