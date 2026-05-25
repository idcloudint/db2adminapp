import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Header,
  HeaderContainer,
  HeaderName,
  HeaderNavigation,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SkipToContent,
  SideNav,
  SideNavItems,
  SideNavLink
} from '@carbon/react';
import {
  Dashboard as DashboardIcon,
  Task,
  Analytics,
  Search,
  DocumentDownload,
  Notification
} from '@carbon/icons-react';
import './Navigation.scss';

const Navigation: React.FC = () => {
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const onClickSideNavExpand = () => {
    setIsSideNavExpanded(!isSideNavExpanded);
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: DashboardIcon },
    { path: '/daily-tasks', label: 'Daily Admin Tasks', icon: Task },
    { path: '/rca', label: 'Root Cause Analysis', icon: Analytics },
    { path: '/investigation', label: 'Complex Investigation', icon: Search },
    { path: '/log-collector', label: 'Log Collector', icon: DocumentDownload }
  ];

  return (
    <HeaderContainer
      render={({ isSideNavExpanded, onClickSideNavExpand }) => (
        <>
          <Header aria-label="DB2 Day 2 Operations">
            <SkipToContent />
            <HeaderMenuButton
              aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
            />
            <HeaderName href="/" prefix="IBM">
              DB2 Day 2 Ops
            </HeaderName>
            <HeaderNavigation aria-label="DB2 Day 2 Operations">
              {menuItems.map((item) => (
                <HeaderMenuItem
                  key={item.path}
                  href={item.path}
                  isCurrentPage={location.pathname === item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                >
                  {item.label}
                </HeaderMenuItem>
              ))}
            </HeaderNavigation>
            <HeaderGlobalBar>
              <HeaderGlobalAction
                aria-label="Notifications"
                tooltipAlignment="end"
              >
                <Notification size={20} />
              </HeaderGlobalAction>
            </HeaderGlobalBar>
            <SideNav
              aria-label="Side navigation"
              expanded={isSideNavExpanded}
              isPersistent={false}
            >
              <SideNavItems>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SideNavLink
                      key={item.path}
                      href={item.path}
                      isActive={location.pathname === item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                        onClickSideNavExpand();
                      }}
                      renderIcon={Icon}
                    >
                      {item.label}
                    </SideNavLink>
                  );
                })}
              </SideNavItems>
            </SideNav>
          </Header>
        </>
      )}
    />
  );
};

export default Navigation;

// Made with Bob
