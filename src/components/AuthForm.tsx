import React from "react";

const RateLimitMessage = () => {
  const rateLimitInfo = {
    code: "rate-limited",
    message: "You have hit the rate limit. Please upgrade to keep chatting.",
    providerLimitHit: false,
    isRetryable: true
  };

  return <div>{rateLimitInfo.message}</div>; // Se muestra en la web
};

export default RateLimitMessage;
