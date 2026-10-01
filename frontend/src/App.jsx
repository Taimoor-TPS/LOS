import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AppState.jsx';
import CustomerFrame from './components/customer/CustomerFrame.jsx';
import OfficeShell from './components/office/OfficeShell.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import DiscoverPage from './pages/DiscoverPage.jsx';
import LoanSimulatorPage from './pages/LoanSimulatorPage.jsx';
import ApplicationPage from './pages/ApplicationPage.jsx';
import IdentityVerificationPage from './pages/IdentityVerificationPage.jsx';
import DecisionPage from './pages/DecisionPage.jsx';
import KeyFactsStatementPage from './pages/KeyFactsStatementPage.jsx';
import ESignPage from './pages/ESignPage.jsx';
import FundsReceivedPage from './pages/FundsReceivedPage.jsx';
import MyLoansPage from './pages/MyLoansPage.jsx';
import RepaymentSchedulePage from './pages/RepaymentSchedulePage.jsx';
import GrowOffersPage from './pages/GrowOffersPage.jsx';
import ConsentSettingsPage from './pages/ConsentSettingsPage.jsx';
import TrackPage from './pages/TrackPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import OfficeLoginPage from './pages/OfficeLoginPage.jsx';
import ApplicationQueuePage from './pages/ApplicationQueuePage.jsx';
import UnderwriterWorkbenchPage from './pages/UnderwriterWorkbenchPage.jsx';
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
import UserAccessPage from './pages/UserAccessPage.jsx';
import DashboardPage from './pages/platform/DashboardPage.jsx';
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
import HomePage from './pages/HomePage.jsx';
import ApplicationsListPage from './pages/ApplicationsListPage.jsx';
import EligibilityPage from './pages/EligibilityPage.jsx';
import PayNowPage from './pages/PayNowPage.jsx';
import SettlementPage from './pages/SettlementPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function Gate({ mode, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Opening the lending platform…</div>;
  if (!user) return <Navigate to={mode === 'office' ? '/office/login' : '/'} replace />;
  if (mode === 'office' && user.role === 'customer') return <Navigate to="/home" replace />;
  if (mode === 'customer' && user.role !== 'customer') return <Navigate to="/office" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerFrame />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/home" element={<Gate mode="customer"><HomePage /></Gate>} />
        <Route path="/discover" element={<Gate mode="customer"><DiscoverPage /></Gate>} />
        <Route path="/applications" element={<Gate mode="customer"><ApplicationsListPage /></Gate>} />
        <Route path="/eligibility" element={<Gate mode="customer"><EligibilityPage /></Gate>} />
        <Route path="/pay" element={<Gate mode="customer"><PayNowPage /></Gate>} />
        <Route path="/pay/:loanId" element={<Gate mode="customer"><PayNowPage /></Gate>} />
        <Route path="/settlement/:loanId" element={<Gate mode="customer"><SettlementPage /></Gate>} />
        <Route path="/profile" element={<Gate mode="customer"><ProfilePage /></Gate>} />
        <Route path="/simulate/:productCode" element={<Gate mode="customer"><LoanSimulatorPage /></Gate>} />
        <Route path="/apply/:productCode" element={<Gate mode="customer"><ApplicationPage /></Gate>} />
        <Route path="/verify/:applicationId" element={<Gate mode="customer"><IdentityVerificationPage /></Gate>} />
        <Route path="/decision/:applicationId" element={<Gate mode="customer"><DecisionPage /></Gate>} />
        <Route path="/key-facts/:applicationId" element={<Gate mode="customer"><KeyFactsStatementPage /></Gate>} />
        <Route path="/sign/:applicationId" element={<Gate mode="customer"><ESignPage /></Gate>} />
        <Route path="/funds/:applicationId" element={<Gate mode="customer"><FundsReceivedPage /></Gate>} />
        <Route path="/my-loans" element={<Gate mode="customer"><MyLoansPage /></Gate>} />
        <Route path="/track" element={<Gate mode="customer"><TrackPage /></Gate>} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/schedule/:loanId" element={<Gate mode="customer"><RepaymentSchedulePage /></Gate>} />
        <Route path="/grow" element={<Gate mode="customer"><GrowOffersPage /></Gate>} />
        <Route path="/settings" element={<Gate mode="customer"><ConsentSettingsPage /></Gate>} />
      </Route>
      <Route path="/office/login" element={<OfficeLoginPage />} />
      <Route path="/office" element={<Gate mode="office"><OfficeShell /></Gate>}>
        <Route index element={<DashboardPage />} />
        <Route path="queue" element={<ApplicationQueuePage />} />
        <Route path="applications" element={<ApplicationsDeskPage />} />
        <Route path="customers" element={<CustomersDeskPage />} />
        <Route path="loans" element={<LoansDeskPage />} />
        <Route path="loans/:accountNo" element={<LoansDeskPage />} />
        <Route path="collections" element={<CollectionsDeskPage />} />
        <Route path="accounting" element={<AccountingDeskPage />} />
        <Route path="provisioning" element={<ProvisioningDeskPage />} />
        <Route path="reports" element={<ReportsDeskPage />} />
        <Route path="product-factory" element={<ProductFactoryPage />} />
        <Route path="integrations" element={<IntegrationsDeskPage />} />
        <Route path="system" element={<SystemDeskPage />} />
        <Route path="workbench/:applicationId" element={<UnderwriterWorkbenchPage />} />
        <Route path="committee" element={<CreditCommitteePage />} />
        <Route path="committee/:applicationId" element={<CommitteePackPage />} />
        <Route path="rm" element={<RelationshipManagerPage />} />
        <Route path="customers/:customerId" element={<Customer360Page />} />
        <Route path="fulfilment" element={<FulfilmentPage />} />
        <Route path="shariah" element={<ShariahControlPage />} />
        <Route path="products" element={<ProductCataloguePage />} />
        <Route path="rules" element={<RulesStudioPage />} />
        <Route path="scorecards" element={<ScorecardStudioPage />} />
        <Route path="regulatory" element={<RegulatoryPacksPage />} />
        <Route path="configuration" element={<ConfigurationEnginePage />} />
        <Route path="campaigns" element={<CampaignOrchestrationPage />} />
        <Route path="dealer" element={<DealerCounterPage />} />
        <Route path="models" element={<ModelGovernancePage />} />
        <Route path="analytics" element={<MisAnalyticsPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route path="warnings" element={<EarlyWarningPage />} />
        <Route path="schemes" element={<SchemeManagementPage />} />
        <Route path="access" element={<UserAccessPage />} />
      </Route>
    </Routes>
  );
}
