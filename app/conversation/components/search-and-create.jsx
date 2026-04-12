"use client"
import { Menu, MenuItem } from "@mui/material"
import Image from "next/image";
import { useState } from "react";

const menuItemSx = {
    fontWeight: 400, fontSize: "12px", lineHeight: "16px", padding: "1rem", gap: 1, height: "22px", borderRadius: "8px", hover: {
        backgroundColor: "red",
    }
};


const Add = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <button
                onClick={handleClick}
                className="h-[30px] w-[30px] cursor-pointer border border-[#47BB17] bg-[#47BB17] flex items-center justify-center rounded-[8px]"
            >
                <Image src="/control-add.svg" width={16} height={16} alt="add" />
            </button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: "8px",
                            padding: "10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            minWidth: 188,
                            boxShadow: "0px 4px 16px rgba(0,0,0,0.12)",
                        },
                    },
                }}
                // Align the dropdown to the bottom-right of the trigger button
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
                <MenuItem sx={menuItemSx} onClick={handleClose}>
                    <Image src="/mic.svg" alt="mic" width={16} height={16} />
                    Instant record
                </MenuItem>
                <MenuItem sx={menuItemSx} onClick={handleClose}>
                    <Image src="/interaction-file.svg" alt="mic" width={16} height={16} />
                    Add Source & transcribe
                </MenuItem>
            </Menu>
        </>
    );
};

const SearchAndCreate = () => {
    return (
        <div className="flex justify-between items-center mt-[50px]">
            <p className="font-bold text-[20px] leading-[32px]">Converse</p>
            <div className="flex items-center gap-1">
                <button className="h-[30px] w-[30px] cursor-pointer border border-black flex items-center justify-center rounded-[8px]">
                    <Image src="/search-icon.svg" width={16} height={16} alt="search" />
                </button>
                <Add />
            </div>
        </div>
    );
};

export default SearchAndCreate;