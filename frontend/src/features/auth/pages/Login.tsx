import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { User, Lock, Eye, EyeClosed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import backgroundImage from '@/assets/images/Ecommer_bg.png';
import logo from '@/assets/images/Bag.svg';
import shield from '@/assets/images/Security.svg';
import delivery from '@/assets/images/Delivery.svg';
import tag from '@/assets/images/Sale_Tag.svg';
import cartImage from '@/assets/images/Cart.png';
import google from '@assets/images/google.png';
import facebook from '@assets/images/facebook.png';
import apple from '@assets/images/apple.png';

export const Login = () => {
    const { login, register, isLoading, isAuthenticated } = useAuth();
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginPage, setIsLoginPage] = useState(true);
    const [email, setEmail] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate()

    useEffect(() => {
        return ()=>
        {setEmail('');
        setPassword('')
        setUsername('')
        setConfirmPassword('')}
    },
    [isLoginPage]);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        const success = isLoginPage?await login(username, password):await register(username, email, password, confirmPassword);
        if (!success) {
            setError('Invalid username or password.');
        }
        setIsSubmitting(false);
    };

    if (isLoading) {
        return <p>Loading...</p>;
    }

    if (isAuthenticated) {;
        navigate('/dashboard');
    }

    return (
        <div
            className="flex flex-col justify-center p-0 h-full align-center bg-cover lg:flex-row lg:p-8"
            style={{ backgroundImage: `url(${backgroundImage})` }}
        >
            {/* Promotion section */}
            <section className="flex-1 p-4 max-w-full md:h-screen lg:p-8 lg:max-w-200">
                <div className="flex justify-start items-center">
                    <img
                        src={logo}
                        alt="Logo"
                        style={{ width: '60px', height: '60px' }}
                    />
                    <h2 className="text-2xl font-medium">ShopEase</h2>
                </div>
                <div className="relative mx-4 lg:mx-12">
                    <div className="p-1 px-4 my-8 w-max text-[#0A5CE4] font-medium bg-[#EAF1FD] rounded-full">
                        Your favorite store, one click away
                    </div>
                    <h1 className="text-5xl font-semibold text-center lg:text-6xl lg:text-start">
                        Welcome to <br></br>
                        <span className="text-6xl lg:text-7xl">
                            Shop<span className="text-[#0A5CE4]">Ease</span>
                        </span>
                    </h1>
                    <h3 className="my-4 text-center text-gray-600 text-md md:my-8 lg:text-xl lg:text-start">
                        Sign in to explore amazing products,<br className="hidden lg:block"></br> exclusive
                        offers and fast delivery.
                    </h3>
                    <div className="flex relative z-10 flex-col gap-8 justify-center md:flex-row lg:flex-col">
                        <div className="flex gap-4 items-center w-max">
                            <img
                                className="bg-[#E3EDFC] rounded-full"
                                src={shield}
                                alt="Security"
                                style={{ width: '60px', height: '60px' }}
                            />
                            <div>
                                <h4 className="font-semibold">
                                    Secure Shopping
                                </h4>
                                <p className="text-gray-600">
                                    Your data is safe with us.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center w-max">
                            <img
                                className="bg-[#E3EDFC] rounded-full"
                                src={delivery}
                                alt="Delivery"
                                style={{ width: '60px', height: '60px' }}
                            />
                            <div>
                                <h4 className="font-semibold">Fast Delivery</h4>
                                <p className="text-gray-600">
                                    Get your products quickly.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center w-max">
                            <img
                                className="bg-[#E3EDFC] rounded-full"
                                src={tag}
                                alt="Sale Tag"
                                style={{ width: '60px', height: '60px' }}
                            />
                            <div>
                                <h4 className="font-semibold">
                                    Exclusive Offers
                                </h4>
                                <p className="text-gray-600">
                                    Get the best deals.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="h-0 lg:h-70"></div>
                    <div className="bottom-0 right-0 lg:absolute">
                        <img
                            className="object-contain mx-auto h-60 md:h-100 lg:h-112.5"
                            src={cartImage}
                            alt="Cart"
                        />
                    </div>
                </div>
            </section>

            {/* Login form section */}
            <section className="justify-center items-center p-4 mx-auto my-auto w-full max-w-150 h-max align-middle bg-white shadow-2xl login-section rounded-4xl lg:flex-1 lg:p-8 lg:mx-10 xl:mx-20">
                <div className="flex flex-col justify-center items-center w-full">
                    <img
                        className="p-3 m-4 bg-[#E3EDFC] rounded-full"
                        src={logo}
                        alt="Bag Icon"
                        width={'100px'}
                    ></img>
                    <h1 className="mb-2 text-3xl font-bold lg:text-4xl">Welcome Back!</h1>
                    <p className="text-sm text-gray-500 lg:text-xl">
                        Sign in to continue to your account
                    </p>
                </div>
                <form className="m-8 mb-4" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            className="block mb-2 font-medium"
                            htmlFor="username"
                        >
                            Username
                        </label>
                        <div className="flex items-center p-2 rounded-lg border-2 border-gray-200">
                            <User className="text-gray-400" size={20} />
                            <input
                                className="pl-2 w-full border-none outline-none"
                                type="text"
                                id="username"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    {!isLoginPage&&
                    <div className="mb-4">
                        <label
                            className="block mb-2 font-medium"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <div className="flex items-center p-2 rounded-lg border-2 border-gray-200">
                            <User className="text-gray-400" size={20} />
                            <input
                                className="pl-2 w-full border-none outline-none"
                                type="email"
                                id="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>}
                    <div className="mb-4">
                        <label
                            className="block mb-2 font-medium"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <div className="flex items-center p-2 rounded-lg border-2 border-gray-200">
                            <Lock className="text-gray-400" size={20} />
                            <input
                                className="pl-2 w-full border-none outline-none"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-gray-400 focus:outline-none"
                            >
                                {showPassword ? (
                                    <Eye size={20} />
                                ) : (
                                    <EyeClosed size={20} />
                                )}
                            </button>
                        </div>
                        
                    </div>
                    {!isLoginPage&&<div className="mb-4">
                        <label
                            className="block mb-2 font-medium"
                            htmlFor="password"
                        >
                            Confirm Password
                        </label>
                        <div className="flex items-center p-2 rounded-lg border-2 border-gray-200">
                            <Lock className="text-gray-400" size={20} />
                            <input
                                className="pl-2 w-full border-none outline-none"
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-gray-400 focus:outline-none"
                            >
                                {showConfirmPassword ? (
                                    <Eye size={20} />
                                ) : (
                                    <EyeClosed size={20} />
                                )}
                            </button>
                        </div>
                        
                    </div>}

                    {error ? (
                        <p className="my-2 text-red-600">{error}</p>
                    ) : null}
                    <div className="flex justify-between mb-4">
                        <div className="flex gap-2 justify-center items-center">
                            <input type="checkbox" id="remember"></input>
                            <label className="font-medium" htmlFor="remember">
                                Remember Me
                            </label>
                        </div>
                        {isLoginPage&&<a href="#" className="text-[#0A5CE4] font-medium">
                            Forgot Password?
                        </a>}
                    </div>

                    <button
                        className="p-2 mt-2 w-full text-white bg-[#0A5CE4] rounded-lg border-2 border-gray-200 cursor-pointer text-md md:p-4 md:text-xl"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Logging in...' : isLoginPage?'Sign In':'Sign Up'}
                    </button>
                </form>
                <div className="flex gap-2 justify-center items-center mx-10 text-sm text-gray-400 lg:mx-20 lg:text-md">
                    <div className="w-[25%] h-px bg-gray-300"></div>
                    or continue with
                    <div className="w-[25%] h-px bg-gray-300"></div>
                </div>
                <div className="flex gap-4 justify-center items-center mx-auto lg:gap-10">
                    <button className="flex gap-2 justify-center items-center p-4 px-8 mt-2 mb-4 rounded-lg border-2 border-gray-200 cursor-pointer">
                        <img
                            src={google}
                            alt="Google Icon"
                            width={'20px'}
                        ></img>
                    </button>
                    <button className="flex justify-center items-center p-4 px-8 mt-2 mb-4 rounded-lg border-2 border-gray-200 cursor-pointer">
                        <img
                            src={facebook}
                            alt="Facebook Icon"
                            width={'20px'}
                        ></img>
                    </button>
                    <button className="flex justify-center items-center p-4 px-8 mt-2 mb-4 rounded-lg border-2 border-gray-200 cursor-pointer">
                        <img src={apple} alt="Apple Icon" width={'20px'}></img>
                    </button>
                </div>
                <div className="m-4 text-center">
                    {
                        isLoginPage?
                        <p className="text-gray-500">
                            Don't have an account?{' '}
                            <button className="text-[#0A5CE4] font-medium" onClick={()=>{setIsLoginPage(!isLoginPage)}}>
                                Sign up
                            </button>
                        </p>:
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <button className="text-[#0A5CE4] font-medium" onClick={()=>{setIsLoginPage(!isLoginPage)}}>
                                Sign In
                            </button>
                        </p>
                        }
                    
                </div>
            </section>
        </div>
    );
};
