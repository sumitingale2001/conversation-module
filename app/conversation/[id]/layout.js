import Header from "./components/header";

const Layout = ({ children }) => {
    return (
        <div className="flex flex-col h-screen w-full bg-white overflow-hidden">
            <Header />
            <main className="flex-1 w-full h-[calc(100vh-60px)] overflow-hidden">
                {children}
            </main>
        </div>
    );
};

export default Layout;