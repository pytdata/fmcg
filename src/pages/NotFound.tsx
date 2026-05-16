import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";

export default function NotFound() {
  return (
    <>
      <PageMeta title="Page Not Found" description="" />
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h1 className="text-6xl font-bold text-amber-500 mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-6 max-w-md">
          The page you are looking for may have been deleted or does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg bg-amber-600 text-white px-6 py-3 text-sm font-medium hover:bg-amber-700"
        >
          Back to Home
        </Link>
      </div>
    </>
  );
}
