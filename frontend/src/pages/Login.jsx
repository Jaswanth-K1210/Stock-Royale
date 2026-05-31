import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Mail, Lock, ArrowRight, TrendingUp } from "lucide-react";
import useAuthStore from "../store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error("Please fill in both fields");
      return;
    }

    try {
      await login(cleanEmail, password);
      toast.success("Welcome back, trader!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative glows + grid */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
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
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 grid place-items-center bg-primary/15 border border-primary/30">
            <TrendingUp className="w-5 h-5 text-primary-bright" />
          </div>
          <span className="font-mono text-sm tracking-[0.3em] text-text-dim uppercase">
            Stock Royale
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="term-panel p-8 relative"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <h1 className="text-3xl font-mono font-bold mb-1.5 text-text uppercase">
            Sign In
          </h1>
          <p className="text-text-dim mb-7 text-sm">
            Access your trading terminal
          </p>

          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary-bright transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                required
                className="term-input !pl-10 !py-3"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary-bright transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="term-input !pl-10 !py-3"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full term-btn bg-primary text-black font-bold mt-6 py-3.5 text-base tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              "CONNECTING..."
            ) : (
              <>
                INITIALIZE SESSION
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <p className="text-sm text-text-dim mt-7 text-center">
            New here?{" "}
            <Link
              to="/register"
              className="text-primary-bright hover:text-primary transition-colors font-semibold"
            >
              Create an account
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
