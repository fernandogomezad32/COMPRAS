import React, { useState } from "react";

// Componente AuthForm
const AuthForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Simulación de rate-limit
  const rateLimitInfo = {
    code: "rate-limited",
    message: "You have hit the rate limit. Please upgrade to keep chatting.",
    providerLimitHit: false,
    isRetryable: true
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Aquí iría tu lógica de login real
    // Simulamos que se alcanza el rate-limit
    setMessage(rateLimitInfo.message);

    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Rate limit info:", rateLimitInfo);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "1rem" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          Login
        </button>
      </form>

      {message && (
        <div style={{ marginTop: "1rem", color: "red" }}>
          {message}
        </div>
      )}
    </div>
  );
};

// Exportación por defecto
export default AuthForm;
