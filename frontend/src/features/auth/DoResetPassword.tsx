import React, { useState } from "react";
import { Link, RouteComponentProps } from "react-router-dom";
import axios from "axios";

import Container from "../../components/basic/Container";
import Button from "../../components/basic/Button";

import useForm from "../../hooks/useForm";

type TParams = { reset_token: string };
interface Props extends RouteComponentProps<TParams> {}

export const DoResetPassword: React.FC<Props> = ({ match }) => {
  const {
    params: { reset_token },
  } = match;
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, Array<string>>
  >({});

  const { inputs, handleSubmit, handleInputChange } = useForm(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const data = {
        id: reset_token,
        user: {
          password: inputs.password,
          password_confirmation: inputs.password_confirmation,
        },
      };
      const res = await axios.post("/be/api/v1/reset-password/update", data);
      setIsLoading(false);
      if (res.status === 200) {
        setIsSuccess(true);
      }
    } catch (e: any) {
      setIsLoading(false);
      setIsError(true);

      const res = e.response;
      if (res != null && res.data != null && res.data.errors != null) {
        setValidationErrors(res.data.errors);
      } else {
        setValidationErrors({});
      }
    }
  });

  if (isSuccess) {
    return (
      <Container>
        <div className="max-w-sm p-8 mx-auto mt-20 bg-gray-100 rounded-lg shadow-lg">
          <div className="font-semibold text-blue-800">
            <h1>Password reset successfully.</h1>
            <Link to="/login" className="inline-block mt-2 text-lg">
              Log In
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-xs p-8 mx-auto mt-20 bg-gray-100 rounded-lg shadow-lg">
        <h1 className="mb-4 font-semibold text-green-900">Reset Password</h1>
        {isLoading && <div>Loading...</div>}
        {isError && (
          <div className="max-w-md alert alert-danger">
            Unable to reset password.
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

        <form action="POST" onSubmit={handleSubmit}>
          <fieldset disabled={isLoading} aria-busy={isLoading}>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-bold text-gray-700">
                password
              </label>
              <input
                type="password"
                name="password"
                placeholder="password"
                className="block mt-2 form-control"
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
                className="block mt-2 form-control"
                onChange={handleInputChange}
                value={inputs.password_confirmation || ""}
              />
            </div>
            <Button isSubmit isPrimary className="mt-2">
              Reset Password
            </Button>
          </fieldset>
        </form>
      </div>
    </Container>
  );
};
export default DoResetPassword;
