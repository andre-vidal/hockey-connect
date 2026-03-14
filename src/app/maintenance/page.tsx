export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔧</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Under Maintenance</h1>
        <p className="text-gray-500">
          Hockey Connect is currently undergoing scheduled maintenance. We&apos;ll be back shortly.
        </p>
      </div>
    </div>
  );
}
