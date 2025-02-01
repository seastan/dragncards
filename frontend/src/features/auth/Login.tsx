import React, { useState, useRef, useEffect } from "react";
import { Link, Redirect } from "react-router-dom";
import axios from "axios";

import Container from "../../components/basic/Container";
import Button from "../../components/basic/Button";

import useForm from "../../hooks/useForm";
import useAuth from "../../hooks/useAuth";

interface Props {}

export const Login: React.FC<Props> = () => {
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { setAuthAndRenewToken } = useAuth();

  // Autofocus effect
  const emailRef = useRef(null);
  useEffect(() => {
    if (emailRef != null && emailRef.current != null) {
      // @ts-ignore: Object is possibly 'null'.
      emailRef.current.focus();
    }
  }, []);

  const { inputs, handleSubmit, handleInputChange } = useForm(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const data = {
        user: {
          email: inputs.email,
          password: inputs.password,
        },
      };
      const res = await axios.post("/be/api/v1/session", data);
      setIsLoading(false);

      if (
        res.status === 200 &&
        res.data.data != null &&
        res.data.data.renew_token != null &&
        res.data.data.token != null
      ) {
        const { renew_token, token } = res.data.data;
        setAuthAndRenewToken(token, renew_token);
        setLoggedIn(true);
      } else {
        throw new Error("Invalid response from Login API");
      }
    } catch (e: any) {
      setIsLoading(false);
      setIsError(true);
      const res = e.response;
      if (
        res != null &&
        res.data != null &&
        res.data.error != null &&
        res.data.error.message != null
      ) {
        setErrorMessage(res.data.error.message);
      } else {
        setErrorMessage(e.message);
      }
    }
  });

  if (isLoggedIn) {
    return <Redirect to="/" />;
  }

  return (
    <Container>
      <div className="mx-auto max-w-xs mt-20 p-8 bg-gray-700 rounded-lg shadow-lg">
        {/* <Logo src={logoImg} /> */}
        <h1 className="font-semibold text-green-200 mb-4">Log In</h1>
        <form action="POST" onSubmit={handleSubmit}>
          <fieldset disabled={isLoading} aria-busy={isLoading}>
            <div className="mb-4">
              <label className="block text-white text-sm font-bold mb-2">
                email
              </label>
              <input
                type="email"
                name="email"
                placeholder="email"
                className="form-control w-full bg-gray-900 text-white"
                onChange={handleInputChange}
                value={inputs.email || ""}
                ref={emailRef}
              />
            </div>
            <div className="mb-6">
              <label className="block text-white text-sm font-bold mb-2">
                password
              </label>
              <input
                type="password"
                name="password"
                placeholder="password"
                className="form-control w-full bg-gray-900 text-white"
                onChange={handleInputChange}
                value={inputs.password || ""}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button isSubmit isPrimary className="mx-2">
                Sign In
              </Button>
            </div>
          </fieldset>
        </form>
        {isError && (
          <div className="alert alert-danger mt-4">{errorMessage}</div>
        )}
        <div className="mt-2">
          <div className="mt-4">
            <Link
              className="text-blue-500 hover:text-blue-800"
              to="/reset-password"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="mt-2">
            <Link className="text-blue-300" to="/signup">
              Don't have an account?
            </Link>       
          </div>
        </div>
      </div>
    </Container>
  );
};
export default Login;
