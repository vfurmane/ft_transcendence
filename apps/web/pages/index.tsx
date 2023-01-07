import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Web() {
  const router = useRouter();

  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    if (access_token === null) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div>
      <h1>Web</h1>
    </div>
  );
}
