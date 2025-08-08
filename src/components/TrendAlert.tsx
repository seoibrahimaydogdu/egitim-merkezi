// src/components/TrendAlert.tsx
import React, { useEffect, useState } from "react";

type Trend = {
  keyword: string;
  alert: string;
  message: string;
  link: string;
  icon: string;
};

const TrendAlert: React.FC = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/trends")
      .then((res) => res.json())
      .then((data) => {
        setTrends(data.trends);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching trends:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4 bg-white rounded-lg shadow-sm animate-pulse">Loading trends...</div>;
  }

  if (trends.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-zinc-200">
      <h2 className="text-lg font-bold text-zinc-900 mb-3 flex items-center">
        <span className="text-2xl mr-2">⭐</span>
        SEO Trend Alert
      </h2>
      <div className="space-y-3">
        {trends.map((trend, index) => (
          <a
            key={index}
            href={trend.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-zinc-100 transition-colors"
          >
            <div className="flex items-center mb-1">
              <span className="text-lg mr-2">{trend.icon}</span>
              <p className="font-semibold text-zinc-800">{trend.keyword}</p>
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                trend.alert === "YÜKSELİŞTE" ? "bg-green-100 text-green-700" :
                trend.alert === "DÜŞÜŞTE" ? "bg-red-100 text-red-700" :
                "bg-zinc-100 text-zinc-700"
              }`}>
                {trend.alert}
              </span>
            </div>
            <p className="text-sm text-zinc-600">{trend.message}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default TrendAlert;