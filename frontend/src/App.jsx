import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AppState.jsx';
import CustomerFrame from './components/customer/CustomerFrame.jsx';
import OfficeShell from './components/office/OfficeShell.jsx';
import OfficeLoginPage from './pages/OfficeLoginPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import {
  ApplicationsPage, ApplyPage, DiscoverPage, DocumentsPage, EligibilityPage, FundsPage, HomePage,
  IdentityPage, LoansPage, NotificationsPage, OfferPage, OtpPage, PasswordPage, PayPage, ProductPage,
  ProfilePage, RegisterPage, ReviewPage, SignInPage, TrackPage, WelcomePage,
} from './pages/channel/ChannelPages.jsx';
import CreditCommitteePage from './pages/CreditCommitteePage.jsx';
import CommitteePackPage from './pages/CommitteePackPage.jsx';
import RelationshipManagerPage from './pages/RelationshipManagerPage.jsx';
import Customer360Page from './pages/Customer360Page.jsx';
import FulfilmentPage from './pages/FulfilmentPage.jsx';
import ShariahControlPage from './pages/ShariahControlPage.jsx';
import ProductCataloguePage from './pages/ProductCataloguePage.jsx';
import RulesStudioPage from './pages/RulesStudioPage.jsx';
import ScorecardStudioPage from './pages/ScorecardStudioPage.jsx';
import RegulatoryPacksPage from './pages/RegulatoryPacksPage.jsx';
import ConfigurationEnginePage from './pages/ConfigurationEnginePage.jsx';
import CampaignOrchestrationPage from './pages/CampaignOrchestrationPage.jsx';
import DealerCounterPage from './pages/DealerCounterPage.jsx';
import ModelGovernancePage from './pages/ModelGovernancePage.jsx';
import MisAnalyticsPage from './pages/MisAnalyticsPage.jsx';
import AuditTrailPage from './pages/AuditTrailPage.jsx';
import EarlyWarningPage from './pages/EarlyWarningPage.jsx';
import SchemeManagementPage from './pages/SchemeManagementPage.jsx';
import DashboardPage, { QueuePage } from './pages/platform/DashboardPage.jsx';
import ApplicationsDeskPage from './pages/platform/ApplicationsDeskPage.jsx';
import CustomersDeskPage from './pages/platform/CustomersDeskPage.jsx';
import LoansDeskPage from './pages/platform/LoansDeskPage.jsx';
import CollectionsDeskPage from './pages/platform/CollectionsDeskPage.jsx';
import AccountingDeskPage from './pages/platform/AccountingDeskPage.jsx';
import ProvisioningDeskPage from './pages/platform/ProvisioningDeskPage.jsx';
import ReportsDeskPage from './pages/platform/ReportsDeskPage.jsx';
import ProductFactoryPage from './pages/platform/ProductFactoryPage.jsx';
import IntegrationsDeskPage from './pages/platform/IntegrationsDeskPage.jsx';
import SystemDeskPage from './pages/platform/SystemDeskPage.jsx';
import WorkbenchPage from './pages/office/WorkbenchPage.jsx';
import FormBuilderPage from './pages/office/FormBuilderPage.jsx';
import AccessPage from './pages/office/AccessPage.jsx';
import CrudScreen from './pages/office/CrudScreen.jsx';

function Gate({ mode, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="boot">Opening the lending platform…</div>;
  if (!user) return <Navigate to={mode === 'office' ? '/office/login' : '/signin'} replace />;
  if (mode === 'office' && user.principal === 'CUSTOMER') return <Navigate to="/home" replace />;
  if (mode === 'customer' && user.principal !== 'CUSTOMER') return <Navigate to="/office" replace />;
  if (mode === 'office' && user.mustChangePassword && location.pathname !== '/office/change-password') {
    return <Navigate to="/office/change-password" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerFrame />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/otp" element={<OtpPage />} />
        <Route path="/register/identity" element={<IdentityPage />} />
        <Route path="/register/password" element={<PasswordPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/home" element={<Gate mode="customer"><HomePage /></Gate>} />
        <Route path="/discover" element={<Gate mode="customer"><DiscoverPage /></Gate>} />
        <Route path="/product/:code" element={<Gate mode="customer"><ProductPage /></Gate>} />
        <Route path="/eligibility/:code" element={<Gate mode="customer"><EligibilityPage /></Gate>} />
        <Route path="/apply/:code" element={<Gate mode="customer"><ApplyPage /></Gate>} />
        <Route path="/documents/:id" element={<Gate mode="customer"><DocumentsPage /></Gate>} />
        <Route path="/review/:id" element={<Gate mode="customer"><ReviewPage /></Gate>} />
        <Route path="/applications" element={<Gate mode="customer"><ApplicationsPage /></Gate>} />
        <Route path="/track/:id" element={<Gate mode="customer"><TrackPage /></Gate>} />
        <Route path="/offer/:id" element={<Gate mode="customer"><OfferPage /></Gate>} />
        <Route path="/funds/:id" element={<Gate mode="customer"><FundsPage /></Gate>} />
        <Route path="/my-loans" element={<Gate mode="customer"><LoansPage /></Gate>} />
        <Route path="/pay/:loanId" element={<Gate mode="customer"><PayPage /></Gate>} />
        <Route path="/notifications" element={<Gate mode="customer"><NotificationsPage /></Gate>} />
        <Route path="/profile" element={<Gate mode="customer"><ProfilePage /></Gate>} />
      </Route>
      <Route path="/office/login" element={<OfficeLoginPage />} />
      <Route path="/office/change-password" element={<Gate mode="office"><ChangePasswordPage /></Gate>} />
      <Route path="/office" element={<Gate mode="office"><OfficeShell /></Gate>}>
        <Route index element={<DashboardPage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="applications" element={<ApplicationsDeskPage />} />
        <Route path="customers" element={<CustomersDeskPage />} />
        <Route path="customers/:customerId" element={<Customer360Page />} />
        <Route path="loans" element={<LoansDeskPage />} />
        <Route path="loans/:accountNo" element={<LoansDeskPage />} />
        <Route path="collections" element={<CollectionsDeskPage />} />
        <Route path="accounting" element={<AccountingDeskPage />} />
        <Route path="provisioning" element={<ProvisioningDeskPage />} />
        <Route path="reports" element={<ReportsDeskPage />} />
        <Route path="product-factory" element={<ProductFactoryPage />} />
        <Route path="integrations" element={<IntegrationsDeskPage />} />
        <Route path="system" element={<SystemDeskPage />} />
        <Route path="workbench/:applicationId" element={<WorkbenchPage />} />
        <Route path="forms" element={<FormBuilderPage />} />
        <Route path="fields" element={<CrudScreen title="Field registry" endpoint="/api/config/fields" createPerm="config:edit" editPerm="config:edit" columns={[{ key: 'fieldCode', label: 'Code' }, { key: 'dataType', label: 'Type' }, { key: 'status', label: 'Status' }]} fields={[{ name: 'fieldCode', label: 'Code' }, { name: 'dataType', label: 'Type' }, { name: 'labelEn', label: 'Label' }]} />} />
        <Route path="workflows" element={<CrudScreen title="Workflows" endpoint="/api/config/workflows" createPerm="config:edit" editPerm="config:edit" columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }]} fields={[{ name: 'code', label: 'Code' }, { name: 'name', label: 'Name' }]} />} />
        <Route path="masters" element={<CrudScreen title="Master data" endpoint="/api/config/masters" createPerm="config:edit" editPerm="config:edit" columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }]} fields={[{ name: 'code', label: 'Code' }, { name: 'name', label: 'Name' }]} />} />
        <Route path="templates" element={<CrudScreen title="Templates" endpoint="/api/config/templates" createPerm="config:edit" editPerm="config:edit" columns={[{ key: 'code', label: 'Code' }, { key: 'channel', label: 'Channel' }]} fields={[{ name: 'code', label: 'Code' }, { name: 'channel', label: 'Channel' }, { name: 'subject', label: 'Subject' }, { name: 'body', label: 'Body', type: 'textarea' }]} />} />
        <Route path="escalations" element={<CrudScreen title="Escalations" endpoint="/api/config/escalations" createPerm="config:edit" editPerm="config:edit" columns={[{ key: 'code', label: 'Code' }, { key: 'trigger', label: 'Trigger' }]} fields={[{ name: 'code', label: 'Code' }, { name: 'trigger', label: 'Trigger' }]} />} />
        <Route path="organisation" element={<CrudScreen title="Organisation" endpoint="/api/config/org/branches" createPerm="config:edit" editPerm="config:edit" columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }]} fields={[{ name: 'code', label: 'Code' }, { name: 'name', label: 'Name' }, { name: 'region', label: 'Region' }]} />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="configuration" element={<ConfigurationEnginePage />} />
        <Route path="rules" element={<RulesStudioPage />} />
        <Route path="scorecards" element={<ScorecardStudioPage />} />
        <Route path="products" element={<ProductCataloguePage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route path="committee" element={<CreditCommitteePage />} />
        <Route path="committee/:applicationId" element={<CommitteePackPage />} />
        <Route path="rm" element={<RelationshipManagerPage />} />
        <Route path="fulfilment" element={<FulfilmentPage />} />
        <Route path="shariah" element={<ShariahControlPage />} />
        <Route path="regulatory" element={<RegulatoryPacksPage />} />
        <Route path="campaigns" element={<CampaignOrchestrationPage />} />
        <Route path="dealer" element={<DealerCounterPage />} />
        <Route path="models" element={<ModelGovernancePage />} />
        <Route path="analytics" element={<MisAnalyticsPage />} />
        <Route path="warnings" element={<EarlyWarningPage />} />
        <Route path="schemes" element={<SchemeManagementPage />} />
      </Route>
    </Routes>
  );
}
