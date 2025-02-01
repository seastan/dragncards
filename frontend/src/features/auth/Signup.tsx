import React, { useState, useRef, useEffect } from "react";
import { Link, Redirect } from "react-router-dom";
import axios from "axios";

import Button from "../../components/basic/Button";

import useForm from "../../hooks/useForm";
import useAuth from "../../hooks/useAuth";

interface Props {}

export const Login: React.FC<Props> = () => {
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, Array<string>>
  >({});
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
          password_confirmation: inputs.password_confirmation,
          alias: inputs.alias,
        },
      };
      const res = await axios.post("/be/api/v1/registration", data);
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
        throw new Error("Invalid response from Register API");
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
      if (
        res != null &&
        res.data != null &&
        res.data.error != null &&
        res.data.error.errors != null
      ) {
        setValidationErrors(res.data.error.errors);
      } else {
        setValidationErrors({});
      }
    }
  });

  if (isLoggedIn) {
    return <Redirect to="/" />;
  }

  return (
    <div className="max-w-xs p-8 mx-auto mt-20 bg-gray-100 rounded-lg shadow-lg">
      {/* <Logo src={logoImg} /> */}
      <h1 className="mb-4 font-semibold text-green-900">Sign Up</h1>
      <form action="POST" onSubmit={handleSubmit}>
        <fieldset disabled={isLoading} aria-busy={isLoading}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              email
            </label>
            <input
              type="email"
              name="email"
              placeholder="email"
              className="block w-full mt-2 form-control"
              onChange={handleInputChange}
              value={inputs.email || ""}
              ref={emailRef}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              password
            </label>
            <input
              type="password"
              name="password"
              placeholder="password"
              className="block w-full mt-2 form-control"
              onChange={handleInputChange}
              value={inputs.password || ""}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              confirm password
            </label>
            <input
              type="password"
              name="password_confirmation"
              placeholder="confirm password"
              className="block w-full mt-2 form-control"
              onChange={handleInputChange}
              value={inputs.password_confirmation || ""}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              nickname
            </label>
            <input
              type="text"
              name="alias"
              placeholder="nickname"
              className="block w-full mt-2 form-control"
              onChange={handleInputChange}
              value={inputs.alias || ""}
            />
            <div className="mt-2 text-xs italic text-gray-600">
              This will be visible to all users on the system.
            </div>
          </div>
          <Button isSubmit isPrimary className="mt-2">
            Sign Up
          </Button>
        </fieldset>
      </form>
      {isError && (
        <div className="mt-4 alert alert-danger">
          <span className="text-xl">{errorMessage}</span>

          {Object.keys(validationErrors)
            .filter((field) => field !== "password_hash")
            .map((field: string) =>
              validationErrors[field].map((message: string) => (
                <div key={field + message}>
                  <span className="font-semibold">{field}</span>: {message}
                </div>
              ))
            )}
        </div>
      )}
      <Link
        className="block mt-4 text-blue-300 hover:text-blue-500"
        to="/login"
      >
        Already have an account?
      </Link>
    </div>
  );
};
export default Login;
