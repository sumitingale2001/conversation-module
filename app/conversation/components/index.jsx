import Header from "./header";
import SearchAndCreate from "./search-and-create";



const Greetings = ({ name }) => {
    return <div className="flex flex-col gap-1 font-bold text-[28px] leading-[34px]">
        <span className="text-[#666666]" >(Good Morning),</span>
        <span className="text-[#47BB17]">({name})!</span>
    </div>
}

const ConversationList = () => {
    return <>
        <Header />
        <div className="max-w-[1215px] w-full mx-auto gap-10 p-5" >
            <Greetings name={'Sumit'} />
            <SearchAndCreate />
        </div>
    </>
}

export default ConversationList;