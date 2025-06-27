const { Resend } = require("resend");

module.exports = async (email, otp, name) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: `SureKeys <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: "Your New OTP Code",
    html: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 25px 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 10px;">Your new OTP code</h2>
      <p style="font-size: 16px; color: #555555; line-height: 1.6;">
        Hello ${name} 👋,<br /><br />
        You recently requested a new OTP to verify your email on <strong>SureKeys</strong>. Please use the code below to continue:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background-color: #e6f4ea; color: #219653; font-size: 22px; font-weight: bold; letter-spacing: 3px; padding: 15px 30px; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 15px; color: #888888;">
        This code will expire in <strong>10 minutes</strong>. If you didn't request a new code, you can safely ignore this email.
      </p>
      <p style="font-size: 14px; color: #cccccc; margin-top: 40px;">
        — The SureKeys Team
      </p>
    </div>
  </div>
  `,
  });
};
