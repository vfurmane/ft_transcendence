import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading";

export default function Web() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access_token = localStorage.getItem("access_token");
    if (access_token === null) {
      router.replace("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) return <Loading></Loading>;

  return (
    <div>
      <h1>Web</h1>
    </div>
  );
}
