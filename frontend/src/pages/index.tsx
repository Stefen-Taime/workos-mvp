// src/pages/index.tsx
import Link from 'next/link'

export default function Home() {
  const tenants = [
    { id: 'demo', name: 'Demo Company', description: 'Environnement de test' },
    { id: 'startup1', name: 'Startup One', description: 'Tech innovante' },
    { id: 'startup2', name: 'Startup Two', description: 'SaaS B2B' },
    { id: 'apple', name: 'Apple', description: 'Think Different' },
    { id: 'google', name: 'Google', description: "Don't be evil" },
    { id: 'netflix', name: 'Netflix', description: 'Entertainment' },
  ]
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            WorkOS
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            L'OS du travail moderne. Gérez vos contacts, tâches et projets dans un seul endroit.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map(tenant => (
            <Link
              key={tenant.id}
              href={`/${tenant.id}`}
              className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-primary-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {tenant.name}
                </h3>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">{tenant.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}