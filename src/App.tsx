/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { EventsPage } from './pages/EventsPage.tsx';
import { EventDetailPage } from './pages/EventDetailPage.tsx';
import { TransactionLookupPage } from './pages/TransactionLookupPage.tsx';
import { WinnersPage } from './pages/WinnersPage.tsx';
import { InfoPage } from './pages/InfoPage.tsx';

// Admin components
import { AdminLoginPage } from './admin/AdminLoginPage.tsx';
import { AdminLayout } from './admin/AdminLayout.tsx';
import { AdminDashboard } from './admin/AdminDashboard.tsx';
import { AdminEvents } from './admin/AdminEvents.tsx';
import { AdminCandidates } from './admin/AdminCandidates.tsx';
import { AdminCategories } from './admin/AdminCategories.tsx';
import { AdminVotePackages } from './admin/AdminVotePackages.tsx';
import { AdminTransactions } from './admin/AdminTransactions.tsx';
import { AdminVotesAudit } from './admin/AdminVotesAudit.tsx';
import { AdminWinners } from './admin/AdminWinners.tsx';
import { AdminReports } from './admin/AdminReports.tsx';
import { AdminCMS } from './admin/AdminCMS.tsx';
import { AdminSettings } from './admin/AdminSettings.tsx';
import { AdminSecurity } from './admin/AdminSecurity.tsx';
import { AdminActivityLogs } from './admin/AdminActivityLogs.tsx';

import { AdminUser } from './types/index.ts';
import { apiRequest, getAdminToken, removeAdminToken } from './api/client.ts';

export default function App() {
  // Navigation state
  const [currentPath, setCurrentPath] = useState<string>('home');
  const [routeParams, setRouteParams] = useState<any>({});

  // Admin authentication state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminSection, setAdminSection] = useState<string>('dashboard');
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Initialize and check current admin token
  useEffect(() => {
    async function checkAdmin() {
      const token = getAdminToken();
      if (token) {
        try {
          const user = await apiRequest('/api/admin/me');
          setAdminUser(user);
        } catch (e) {
          removeAdminToken();
          setAdminUser(null);
        }
      }
      setAuthChecking(false);
    }
    checkAdmin();
  }, []);

  const navigateTo = (path: string, params: any = {}) => {
    setCurrentPath(path);
    setRouteParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = async () => {
    try {
      await apiRequest('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    removeAdminToken();
    setAdminUser(null);
    setCurrentPath('home');
  };

  // If in Admin Section
  if (currentPath === 'admin') {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (!adminUser) {
      return (
        <AdminLoginPage
          onLoginSuccess={(user) => {
            setAdminUser(user);
            setAdminSection('dashboard');
          }}
          onBackToPublic={() => navigateTo('home')}
        />
      );
    }

    return (
      <AdminLayout
        admin={adminUser}
        activeSection={adminSection}
        onSelectSection={setAdminSection}
        onLogout={handleAdminLogout}
        onViewPublicSite={() => navigateTo('home')}
      >
        {adminSection === 'dashboard' && <AdminDashboard onNavigateSection={setAdminSection} />}
        {adminSection === 'events' && <AdminEvents />}
        {adminSection === 'categories' && <AdminCategories />}
        {adminSection === 'candidates' && <AdminCandidates />}
        {adminSection === 'packages' && <AdminVotePackages />}
        {adminSection === 'votes' && <AdminVotesAudit />}
        {adminSection === 'activity-logs' && <AdminActivityLogs />}
        {adminSection === 'transactions' && <AdminTransactions />}
        {adminSection === 'winners' && <AdminWinners />}
        {adminSection === 'reports' && <AdminReports />}
        {adminSection === 'cms' && <AdminCMS />}
        {adminSection === 'settings' && <AdminSettings />}
        {adminSection === 'security' && (
          <AdminSecurity admin={adminUser} onAdminUpdated={setAdminUser} />
        )}
      </AdminLayout>
    );
  }

  // Public Website Shell
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Public Navbar */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigateTo}
        isAdminLoggedIn={Boolean(adminUser)}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {currentPath === 'home' && <HomePage onNavigate={navigateTo} />}

        {currentPath === 'events' && (
          <EventsPage
            onNavigate={navigateTo}
            initialSearch={routeParams.search || ''}
          />
        )}

        {currentPath === 'event-detail' && (
          <EventDetailPage
            slug={routeParams.slug || 'moon-star-model-look-2027'}
            onNavigate={navigateTo}
          />
        )}

        {currentPath === 'check-transaction' && (
          <TransactionLookupPage
            initialCode={routeParams.code || ''}
            onNavigate={navigateTo}
          />
        )}

        {currentPath === 'winners' && <WinnersPage onNavigate={navigateTo} />}

        {currentPath === 'info' && (
          <InfoPage
            slug={routeParams.slug || 'about'}
            onNavigate={navigateTo}
          />
        )}

        {currentPath === 'faq' && (
          <InfoPage
            slug="faq"
            onNavigate={navigateTo}
          />
        )}
      </main>

      {/* Public Footer */}
      <Footer onNavigate={navigateTo} />
    </div>
  );
}
