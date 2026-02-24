import React from 'react';
import { Navbar, Container, Nav, NavbarBrand } from 'react-bootstrap';
import { LayoutDashboard, Users, Settings, Rocket } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm mb-4">
                <Container>
                    <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
                        <Rocket size={24} className="text-primary" />
                        <span className="fw-bold text-uppercase tracking-wider">Pré-Incubação PampaTec</span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto gap-3">
                            <Nav.Link as={Link} to="/" className="d-flex align-items-center gap-2">
                                <LayoutDashboard size={18} /> Dashboard
                            </Nav.Link>
                            <Nav.Link as={Link} to="/novo-time" className="d-flex align-items-center gap-2">
                                <Users size={18} /> Novo Time
                            </Nav.Link>
                            <Nav.Link as={Link} to="/configuracoes" className="d-flex align-items-center gap-2">
                                <Settings size={18} /> Configurações
                            </Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="flex-grow-1">
                <div className="fade-in">
                    <Outlet />
                </div>
            </Container>

            <footer className="py-3 bg-white border-top mt-5">
                <Container className="text-center text-muted small">
                    &copy; {new Date().getFullYear()} PampaTec - Sistema de Gestão de Pré-Incubação
                </Container>
            </footer>
        </div>
    );
};

export default Layout;
