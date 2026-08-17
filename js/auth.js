// ============================================
// USMCF — LÓGICA DE AUTENTICACIÓN
// ============================================
(function () {
  "use strict";

  // --- Referencias DOM ---
  var loginForm = document.getElementById("loginForm");
  var registerForm = document.getElementById("registerForm");
  var recoverForm = document.getElementById("recoverForm");

  // --- UTILIDADES ---
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function showError(msg) {
    var el = $(".auth-message.error");
    var s = $(".auth-message.success");
    if (el) { el.textContent = msg; el.classList.add("show"); }
    if (s) s.classList.remove("show");
  }

  function showSuccess(msg) {
    var el = $(".auth-message.success");
    var e = $(".auth-message.error");
    if (el) { el.textContent = msg; el.classList.add("show"); }
    if (e) e.classList.remove("show");
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.origText = btn.textContent;
      btn.innerHTML = '<span class="auth-spinner"></span>Cargando...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.origText || btn.textContent;
    }
  }

  function validatePassword(pw) {
    if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pw)) return "Debe contener al menos una mayúscula.";
    if (!/[0-9]/.test(pw)) return "Debe contener al menos un número.";
    return null;
  }

  // --- VERIFICAR SESIÓN EXISTENTE ---
  async function checkSession() {
    if (!supabase) return;
    var result = await supabase.auth.getSession();
    var session = result.data.session;
    if (!session) return;

    var userResult = await supabase
      .from("profiles")
      .select("rol, estado")
      .eq("id", session.user.id)
      .single();

    if (!userResult.data) return;
    var profile = userResult.data;

    // Solo redirigir desde páginas de auth si YA hay sesión activa
    var page = window.location.pathname.split("/").pop();
    var isAuthPage = ["login.html", "register.html", "recuperar.html", ""].indexOf(page) !== -1;

    if (isAuthPage) {
      if (profile.estado === "pendiente") {
        window.location.href = "pendiente.html";
      } else {
        window.location.href = profile.rol === "admin" || profile.rol === "super_admin"
          ? "admin.html"
          : profile.rol === "staff"
            ? "staff.html"
            : "dashboard.html";
      }
    }
  }

  // --- LOGIN ---
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = $("#loginEmail").value.trim();
      var password = $("#loginPassword").value;
      var btn = $("#loginBtn");

      if (!email || !password) {
        showError("Completa todos los campos.");
        return;
      }

      setLoading(btn, true);

      try {
        var result = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (result.error) {
          showError(
            result.error.message.includes("Invalid login")
              ? "Correo o contraseña incorrectos."
              : result.error.message
          );
          setLoading(btn, false);
          return;
        }

        // Obtener perfil
        var profileResult = await supabase
          .from("profiles")
          .select("rol, estado")
          .eq("id", result.data.user.id)
          .single();

        var profile = profileResult.data;

        // Registrar último login
        await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", result.data.user.id);

        if (profile.estado === "pendiente") {
          window.location.href = "pendiente.html";
        } else if (profile.estado === "inactivo") {
          showError("Tu cuenta está desactivada. Contacta al administrador.");
          await supabase.auth.signOut();
          setLoading(btn, false);
        } else {
          window.location.href = profile.rol === "admin" || profile.rol === "super_admin"
            ? "admin.html"
            : profile.rol === "staff"
              ? "staff.html"
              : "dashboard.html";
        }
      } catch (err) {
        showError("Error de conexión. Intenta de nuevo.");
        setLoading(btn, false);
      }
    });
  }

  // --- REGISTRO ---
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var nombre = $("#regNombre").value.trim();
      var roblox = $("#regRoblox").value.trim();
      var email = $("#regEmail").value.trim();
      var password = $("#regPassword").value;
      var confirm = $("#regConfirm").value;
      var btn = $("#regBtn");

      // Validaciones
      if (!nombre || !roblox || !email || !password || !confirm) {
        showError("Completa todos los campos.");
        return;
      }
      if (password !== confirm) {
        showError("Las contraseñas no coinciden.");
        return;
      }
      var pwError = validatePassword(password);
      if (pwError) {
        showError(pwError);
        return;
      }

      setLoading(btn, true);

      try {
        var result = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              nombre: nombre,
              usuario_roblox: roblox
            }
          }
        });

        if (result.error) {
          showError(
            result.error.message.includes("already registered")
              ? "Este correo ya está registrado."
              : result.error.message
          );
          setLoading(btn, false);
          return;
        }

        // Si Supabase requiere confirmación por email
        if (result.data.user && !result.data.session) {
          showSuccess("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
          registerForm.reset();
          setLoading(btn, false);
          return;
        }

        // Si se creó directamente, redirigir a pendiente
        window.location.href = "pendiente.html";
      } catch (err) {
        showError("Error de conexión. Intenta de nuevo.");
        setLoading(btn, false);
      }
    });
  }

  // --- RECUPERAR CONTRASEÑA ---
  if (recoverForm) {
    recoverForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = $("#recoverEmail").value.trim();
      var btn = $("#recoverBtn");

      if (!email) {
        showError("Ingresa tu correo electrónico.");
        return;
      }

      setLoading(btn, true);

      try {
        var result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/restablecer.html"
        });

        if (result.error) {
          showError(result.error.message);
          setLoading(btn, false);
          return;
        }

        showSuccess("Contraseña restablecida. Tu nueva contraseña temporal es: Reset123! — Cámbiala después de iniciar sesión.");
        recoverForm.reset();
        setLoading(btn, false);
      } catch (err) {
        showError("Error de conexión. Intenta de nuevo.");
        setLoading(btn, false);
      }
    });
  }

  // --- LOGOUT ---
  window.logout = async function () {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "login.html";
  };

  // --- OBTENER PERFIL ACTUAL ---
  window.getMyProfile = async function () {
    if (!supabase) return null;
    var session = await supabase.auth.getSession();
    if (!session.data.session) return null;
    var result = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.data.session.user.id)
      .single();
    return result.data;
  };

  // --- VERIFICAR SESIÓN AL CARGAR ---
  document.addEventListener("DOMContentLoaded", function () {
    if (supabase) checkSession();
  });

})();
