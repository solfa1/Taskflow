import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "10s",
};

export default function () {
  const url = "http://localhost:3000/tasks";

  const payload = JSON.stringify({
    type: "email",
    payload: {
      to: "user@test.com",
      message: "hello",
    },
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  console.log(`Status: ${res.status}`);
  console.log(`Body: ${res.body}`);

  check(res, {
    "status is 201": (r) => r.status === 201,
  });

  sleep(1);
}