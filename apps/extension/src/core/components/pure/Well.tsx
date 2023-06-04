export function Well({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow-md">
      {children}
    </div>
  )
}
