import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { User, Mail, Lock, ArrowRight, Swords, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import useAuthStore from "../store/authStore";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

export default function Register() {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const { register, sendOtp, loading } = useAuthStore();
  const navigate = useNavigate();

  // Password Validation States
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[@$!%*?&]/.test(password);
  const hasLength = password.length >= 6;
  const isPasswordValid = hasLower && hasUpper && hasNumber && hasSymbol && hasLength;

  const handleSendOtp = async (e) => {
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
      await sendOtp(cleanEmail);
      toast.success("OTP sent! Check your terminal console (dev mode).");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    try {
      await register(username.trim(), email.trim(), password, otp);
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
            {step === 1 ? "Choose your trader alias and secure your account" : "Enter the OTP sent to your email"}
          </p>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOtp}
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

                {/* Password Requirements UI */}
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
                  {loading ? "SENDING..." : "SEND OTP"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint group-focus-within:text-primary-bright transition-colors" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-Digit OTP Code"
                    required
                    className="input-field !pl-10 !py-3 rounded-lg text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="w-1/3 term-btn py-3.5 text-xs font-display tracking-wider rounded-lg disabled:opacity-50"
                  >
                    BACK
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-2/3 group btn-primary py-3.5 text-xs sm:text-sm font-display tracking-wider rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "VERIFYING..." : "VERIFY & CREATE"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {step === 1 && (
            <p className="text-sm text-text-dim mt-7 text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary-bright hover:text-primary transition-colors font-semibold"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
