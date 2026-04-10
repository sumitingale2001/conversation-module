import { Button, Dialog } from "@mui/material";
import Image from "next/image";

/* =========================
   Reusable Icon Button
========================= */
const IconButton = ({
    icon,
    label,
    onClick,
    className = "",
    textClass = "",
}) => {
    return (
        <button
            onClick={onClick}
            className={`flex px-2 py-1 items-center gap-1 bg-[#DDDFEC] rounded-[8px] hover:opacity-80 transition ${className}`}
        >
            {icon && <Image src={icon} height={20} width={20} alt={label} />}
            <span
                className={`font-bold text-[12px] leading-[16px] ${textClass}`}
            >
                {label}
            </span>
        </button>
    );
};

/* =========================
   Header Section
========================= */
const Header = ({ handleClose }) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <p className="font-sans font-bold text-[14px] leading-[20px]">
                    Add sources
                </p>
                <p className="font-sans font-normal text-[12px] leading-[16px] text-gray-500">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic, impedit.
                </p>
            </div>

            <Image
                onClick={handleClose}
                src="/controls.png"
                className="cursor-pointer"
                height={24}
                width={24}
                alt="close"
            />
        </div>
    );
};

/* =========================
   Card Component (Reusable)
========================= */
const Card = ({ title, icon, buttons }) => {
    return (
        <div className="p-[10px] col-span-6 flex-1 h-[199px] space-y-3 rounded-[8px] border border-gray-300">
            <div className="flex gap-1 items-center">
                <Image src={icon} height={20} width={20} alt={title} />
                <span className="font-bold text-[#666666] text-[14px] leading-[24px]">
                    {title}
                </span>
            </div>

            <div className="flex items-center flex-wrap gap-3">
                {buttons.map((btn) => (
                    <IconButton
                        key={btn.label}
                        icon={btn.icon}
                        label={btn.label}
                        onClick={btn.onClick}
                    />
                ))}
            </div>
        </div>
    );
};


const UploadInput = () => {
    return <div className="rounded-lg col-span-12 border-2 border-dashed border-gray-400 bg-gray-100 p-6 h-[169px] flex flex-col items-center justify-center gap-2">
        <button variant="outline" className="gap-2 flex items-center font-bold text-[10px] leading-[16px] text-[#221B88]">
            <Image
                src="/upload-media.png"
                className="cursor-pointer"
                height={24}
                width={24}
                alt="upload"
            />
            Upload Sources
        </button>
        <p className="text-[12px] text-muted-foreground">
            Drag & drop or{" "}
            <span className="text-blue-500 underline cursor-pointer">
                choose file
            </span>{" "}
            to upload
        </p>
    </div>
}


const SourcesAdded = () => {
    return <div className="w-full h-full p-[10px] flex flex-col rounded-[8px] justify-between bg-[#F4F5F5]">
        <p className="font-bold text-[12px] leading-[16px] text-[#666666]">
            [0] Sources added
        </p>
        <div className="flex-1 flex items-center justify-center">
            <Image src="/persona.png" width={45} height={45} alt="persona" />
        </div>

        <div className="flex items-center justify-end">
            <button className="disabled:bg-gray-400 bg-[#221B88] text-white px-4 py-2 rounded-[8px]" disabled >Add</button>
        </div>

    </div>
}

/* =========================
   Main Popup
========================= */
const ConversationPopup = ({ open, handleClose }) => {
    const classyButtons = [
        {
            icon: "/search-icon.png",
            label: "Search tags",
            onClick: () => console.log("Search tags"),
        },
        {
            icon: "/profile-user.png",
            label: "Personal",
            onClick: () => console.log("Personal"),
        },
        {
            icon: "/Copilot.png",
            label: "Group",
            onClick: () => console.log("Group"),
        },
        {
            icon: "/institution-logo.png",
            label: "Institution",
            onClick: () => console.log("Institution"),
        },
    ];

    const externalButtons = [
        {
            icon: "/google-drive.png",
            label: "Google drive",
            onClick: () => console.log("Google Drive"),
        },
        {
            icon: "/one-drive.png",
            label: "One drive",
            onClick: () => console.log("One Drive"),
        },
        {
            icon: "/dropbox-logo.png",
            label: "Dropbox",
            onClick: () => console.log("Dropbox"),
        },
    ];

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth={false}
            sx={{
                "& .MuiDialog-paper": {
                    width: "989px",
                    height: "530px",
                    maxWidth: "none",
                    margin: 0,
                    borderRadius: "12px",
                },
            }}
        >
            <div className="p-[20px] space-y-5">
                <Header handleClose={handleClose} />


                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-7 grid grid-cols-12 gap-5">
                        <Card
                            title="Classy Cloud"
                            icon="/hash.png"
                            buttons={classyButtons}
                        />
                        <Card
                            title="External drives"
                            icon="/cloud.png"
                            buttons={externalButtons}
                        />
                        <UploadInput />
                        <div className="col-span-12">
                            <>
                                <div className="text-[10px] text-muted-foreground leading-tight">
                                    Per file limit is [1gb], for best results have file up to [500mb]
                                    <br />
                                    Supported formats: <span className="text-primary underline cursor-pointer">Audio</span>
                                </div>
                            </>
                        </div>
                    </div>

                    <div className="col-span-5">
                        <SourcesAdded />
                    </div>
                </div>

            </div>
        </Dialog>
    );
};

export default ConversationPopup;