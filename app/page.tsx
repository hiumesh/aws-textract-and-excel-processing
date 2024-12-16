"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { ProcessedData } from "./api/upload/aws";
import { TableRows } from "./api/upload/excel";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProcessedData | TableRows | null>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      if (loading) return;
      if (e.target.files) {
        setLoading(true);
        const formData = new FormData();
        Object.values(e.target.files).forEach((file) => {
          formData.append("file", file);
        });

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok)
          throw new Error(data?.message || "Something went wrong!");

        setData(data);
        setLoading(false);

        toast.success("File processed successfully!");
      }
    } catch (error) {
      setLoading(false);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong!");
      }
    }
  };
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div>
          <input
            type="file"
            name="file"
            disabled={loading}
            onChange={handleFileUpload}
          />
          {loading ? <p>Processing...</p> : null}
        </div>
        <div>
          <h1>Queries</h1>
          {data && "queries" in data && data?.queries && (
            <ul className="space-y-2">
              {data?.queries?.map((r, idx) => (
                <li key={idx} className="p-1 flex gap-2">
                  <div className="border max-w-sm py-1 px-2">{r.Query}</div>
                  <div className="border max-w-sm py-1 px-2">{r.Result}</div>
                  <div className="border max-w-sm text-blue-500 py-1 px-2">
                    {r.Confidence && Math.floor(r.Confidence)}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {data && "rows" in data && data?.rows && data?.rows?.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Column One</th>
                <th>Column Two</th>
              </tr>
            </thead>
            <tbody>
              {data &&
                "rows" in data &&
                data?.rows?.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.Column1}</td>
                    <td>{r.Column2}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot />
          </table>
        )}
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        @pv
      </footer>
    </div>
  );
}
