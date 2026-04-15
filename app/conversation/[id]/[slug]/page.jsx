import ConversationContent from "./components";



const Page = async ({ params }) => {
    const { slug } = await params
    return <ConversationContent slug={slug} />
}

export default Page;