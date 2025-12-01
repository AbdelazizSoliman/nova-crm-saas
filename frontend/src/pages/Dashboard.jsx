import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/dashboard/summary", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setSummary(data));
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Welcome, {user?.name}</h1>

      {summary ? (
        <pre className="mt-4 bg-gray-100 p-4 rounded">
          {JSON.stringify(summary, null, 2)}
        </pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
