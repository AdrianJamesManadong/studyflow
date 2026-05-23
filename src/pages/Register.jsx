import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordValue = watch('password', '')
  const confirmValue = watch('confirmPassword', '')
  const passwordsMatch = confirmValue && passwordValue === confirmValue

  async function onSubmit(data) {
    try {
      setServerError('')
      await registerUser(data.email, data.password, data.name)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">StudyFlow</h1>
          <p className="text-gray-400 mt-2">Create your account and start studying smarter.</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create account</h2>

          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                type="text"
                placeholder="Adrian James"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                })}
                type="email"
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}

              {/* Password strength */}
              {passwordValue && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          passwordValue.length >= 6 && i === 0 ? 'bg-red-500' :
                          passwordValue.length >= 8 && i <= 1 ? 'bg-amber-500' :
                          passwordValue.length >= 10 && i <= 2 ? 'bg-emerald-400' :
                          passwordValue.length >= 12 && i <= 3 ? 'bg-emerald-500' :
                          'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {passwordValue.length < 6 ? 'Too short' :
                     passwordValue.length < 8 ? '🔴 Weak' :
                     passwordValue.length < 10 ? '🟡 Fair' :
                     passwordValue.length < 12 ? '🟢 Good' : '🟢 Strong'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: val => val === watch('password') || 'Passwords do not match'
                  })}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none transition pr-10
                    ${confirmValue
                      ? passwordsMatch
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : 'border-red-500 focus:border-red-500'
                      : 'border-gray-700 focus:border-indigo-500'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmValue && (
                <p className={`text-xs mt-1 ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
              {errors.confirmPassword && !confirmValue && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
                <p className="text-red-400 text-sm">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit(onSubmit)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition mt-2"
            >
              Create account
            </button>

          </div>

          <p className="text-gray-500 text-sm text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}