import "./DashboardDemo.css";

export default function DashboardDemo() {
  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card">

        {/* ✅ TOP BAR */}
        <div className="top-bar">
          <img src= "/assets/logo/payrolllogo.svg" />
        </div>

        {/* ✅ HEADER */}
        <div className="header-row">
        <span>PROCESSING PAYROLL</span>
          <span className="amount">£142,850</span>
        </div>
 
        {/* ✅ PROGRESS BAR */}
        <div className="progress">
          <div className="progress-fill"></div>
        </div>

        {/* ✅ USERS */}

        {/* Forced visibility container */}
        <div className="users" style={{ display: 'flex', flexDirection: 'column', minHeight: '100px', opacity: 1, visibility: 'visible' }}>
          {[
            {
              initials: "JS",
              name: "John Smith",
              role: "Engineering",
              amount: "£3,250",
            },
            {
              initials: "SJ",
              name: "Sarah Johnson",
              role: "Marketing",
              amount: "£2,890",
            },
            {
              initials: "MW",
              name: "Mike Williams",
              role: "Operations",
              amount: "£3,100",
            },
            {
              initials: "ED",
              name: "Emma Davis",
              role: "Finance",
              amount: "£3,450",
            },
          ].map((user, i) => (
            <div 
              className="user" 
              key={i} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 1, color: 'var(--primary)', visibility: 'visible' }}
            >
              <div className="user-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar" style={{ color: 'var(--primary)' }}>{user.initials}</div>
                <div style={{ display: 'block', textAlign: 'left' }}>
                  <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '18px' }}>{user.name}</strong>
                  <p style={{ color: 'var(--primary)', margin: '2px 0 0 0', fontSize: '16px', display: 'block' }}>{user.role}</p>
                </div>
              </div>

              <div className="user-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="user-amount" style={{ color: 'var(--primary)', fontWeight: 600 }}>{user.amount}</span>
                <span className="check" style={{ color: 'var(--secondary)' }}>✔</span>
              </div>
            </div>
          ))}
        </div>

        <div className = "line" > </div>

        {/* ✅ BOTTOM */}
        <div className="footer">
          <div>
            <span className="label">Employees</span>
            <strong>247</strong>
          </div>
          <div>
            <span className="label">Payslip</span>
            <strong className="gold">Generated</strong>
          </div>
          <div>
            <span className="label">Pension</span>
            <strong className="gold">Auto</strong>
          </div>
        </div>

      </div>
    </div>
  );
}