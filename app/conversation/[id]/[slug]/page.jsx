import ConversationContent from "./components";
import ViewModeController from "./components/view-mode-controller";

const Page = async ({ params }) => {
    const { slug, id } = await params;
    return (
        <>
            <ViewModeController slug={slug} id={id} />
            <ConversationContent />
        </>
    );
}

export default Page;