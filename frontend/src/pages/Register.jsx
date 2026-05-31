import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { User, Mail, Lock, ArrowRight, Swords, CheckCircle2, XCircle } from "lucide-react";
import useAuthStore from "../store/authStore";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[@$!%*?&]/.test(password);
  const hasLength = password.length >= 6;
  const isPasswordValid = hasLower && hasUpper && hasNumber && hasSymbol && hasLength;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (cleanUsername.length < 3) {
      toast.error("Trader alias must be at least 3 characters");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Please meet all password requirements");
      return;
    }

    try {
      await register(cleanUsername, cleanEmail, password);
      toast.success("Account created! Welcome to the arena!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border-bright) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-bright) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 grid place-items-center rounded-lg bg-primary/15 border border-primary/30">
            <Swords className="w-5 h-5 text-primary-bright" />
          </div>
          <span className="font-mono text-sm tracking-[0.3em] text-text-dim uppercase">
            Stock Royale
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <h1 className="text-3xl font-display font-bold mb-1.5 text-text">
            Create Account
          </h1>
          <p className="text-text-dim mb-7 text-sm">
            Choose your trader alias and secure your account
          </p>

          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary-bright transition-colors" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Trader Alias"
                autoComplete="username"
                required
                minLength={3}
                className="input-field !pl-10 !py-3 rounded-lg"
              />
            </div>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary-bright transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                required
                className="input-field !pl-10 !py-3 rounded-lg"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary-bright transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
                required
                className="input-field !pl-10 !py-3 rounded-lg"
              />
            </div>

            {password.length > 0 && (
              <div className="bg-bg/50 p-3 rounded-lg border border-border/50 text-[11px] grid grid-cols-2 gap-2 mt-2">
                <div className={`flex items-center gap-1.5 ${hasLength ? "text-bull" : "text-text-faint"}`}>
                  {hasLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} 6+ characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? "text-bull" : "text-text-faint"}`}>
                  {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} Uppercase
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? "text-bull" : "text-text-faint"}`}>
                  {hasLower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} Lowercase
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-bull" : "text-text-faint"}`}>
                  {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} Number
                </div>
                <div className={`flex items-center gap-1.5 ${hasSymbol ? "text-bull" : "text-text-faint"} col-span-2`}>
                  {hasSymbol ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} Symbol (@$!%*?&)
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (password.length > 0 && !isPasswordValid)}
              className="group w-full btn-primary mt-6 py-3.5 text-base font-display tracking-wider rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "CREATING..." : "CREATE ACCOUNT"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.form>

          <p className="text-sm text-text-dim mt-7 text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary-bright hover:text-primary transition-colors font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
