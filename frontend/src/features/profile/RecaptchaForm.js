import React, { useRef } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import Button from "../../components/basic/Button";


const RecaptchaForm = () => {
    const recaptchaRef = useRef();
    const authOptions = useAuthOptions();
  
    const handleButtonClick = async () => {
      const value = await recaptchaRef.current.executeAsync();
      // value will contain the reCAPTCHA token upon successful completion
      
      try {
        await axios.post('/be/api/v1/recaptcha/verify', { token: value }, authOptions);    

        alert('Account confirmed. Please log out and back in.');
      } catch (error) {
        alert('reCAPTCHA verification failed');
      }
    };
  
    return (
      <div>
        <Button isSubmit isPrimary className="mx-2" onClick={handleButtonClick}>
            Confirm Account
        </Button>
        <ReCAPTCHA 
          ref={recaptchaRef}
          sitekey="6LeTSD4oAAAAAPXnFo2EqTAWWJS6qUE7Yf4RuRgU" 
          size="invisible"  // This makes it a v3 reCAPTCHA
        />
      </div>
    );
};

export default RecaptchaForm;
