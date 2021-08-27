$(document).ready( () => {
    if($("div[chip]").length != 0){
        $("div[chip]").each( function() {
            addchip(JSON.parse($(this).attr("chip")))
        })
    }
    $("div[chip]").delegate(".addchip", "click", function() {
        //get selected value 
        let chips = JSON.parse($("div[chip]").attr("chip")), selectedchip
        const selected = $("div[chip]").attr("chip-selected") 
        for(let i = 0; i < chips.length; i++) {
            if(chips[i].id === selected){
                selectedchip = chips[i].id
                chips.splice(i, 1)
                break
            }
        }
        $("div[chip]").attr("chip", JSON.stringify(chips))
        //get last chip input 
        const active = $("div[chip]").find(".activechip") 
        if(active.find("select").val() && active.find("input").val()){
            $(this).parent().parent().parent().removeClass("chip-input-active")
            $(this).parent().parent().parent().find("select, input").prop("disabled", true)
            $(this).parent().parent().parent().find("select").removeClass("activeselect")
            //remove current active chip
            $(this).parent().parent().prev().removeClass("activechip")
            //add close button 
            $(this).parent().append(`
                <a data="${selectedchip}" class="removechip rpl cursor-pointer dark:text-rose-600 text-2xl px-2 rounded-md">
                    <i class="fad fa-times-circle"></i>
                </a>
            `)  
            $(this).remove()
            addchip(chips)
        }
    })
    function addchip(chipvalue){
        if(chipvalue.length != 0){
            $("div[chip]").append(`
                <div class="chip-input chip-input-active animate__animated animate__fadeInUp ms-500 flex flex-row gap-1">
                    <div class="activechip w-full grid grid-cols-2 gap-2 p-2">
                        <select pending name="positions" class="activeselect disabled:cursor-not-allowed dark:bg-darkBlue-secondary appearance-none dark:text-gray-200 dark_border dark:focus:border-purple-600 w-full outline-none border border-gray-300 rounded-md focus:border-purple-600  transition-all py-2 px-3 text-gray-900 " autocomplete="off" required>
                            <option value="">Select Postion</option>
                        </select>
                        <input type="number" placeholder="Max Vote" name="max_vote" class="disabled:cursor-not-allowed dark:bg-darkBlue-secondary appearance-none dark:text-gray-200 dark_border dark:focus:border-purple-600 w-full outline-none border border-gray-300 rounded-md focus:border-purple-600  transition-all py-2 px-3 text-gray-900 " autocomplete="off" required>
                    </div>
                    <div class="chip-input-actions p-1">
                        <div class="flex flex-row gap-1 justify-center items-center h-full">
                            <a class="addchip rpl cursor-pointer dark:text-green-600 text-2xl px-2 rounded-md">
                                <i class="fad fa-check-circle"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `)
            for(let i = 0; i < chipvalue.length; i++){
                $('select[pending]').append(`
                    <option value="${chipvalue[i].id}">${chipvalue[i].type}</option>
                `)
            }
            $('select[pending]').removeAttr("pending")
        }
    }
    $("div[chip]").delegate(".activeselect", "change", function() {
        $("div[chip]").attr("chip-selected", $(this).val())
    })
    $("div[chip]").delegate(".removechip", "click", function() {
        var chipvalue = JSON.parse($("div[chip]").attr("chip"))
        if(chipvalue.length == 0){
            //if chip is not empty add the remove item to the array 
            const s = $(this).attr("data")
            const defaultchip = JSON.parse($("div[chip]").attr("chipdefault"))
            var chip = JSON.parse($("div[chip]").attr("chip"))
            for(var i = 0; i < defaultchip.length; i++){
                if(s === defaultchip[i].id){
                    chip.push(defaultchip[i])
                    $("div[chip]").attr("chip", JSON.stringify(chip))
                    break
                }
            }
            $("div[chip]").append(`
                <div class="chip-input chip-input-active animate__animated animate__fadeInUp ms-500 flex flex-row gap-1">
                    <div class="activechip w-full grid grid-cols-2 gap-2 p-2">
                        <select pending name="positions" class="activeselect disabled:cursor-not-allowed dark:bg-darkBlue-secondary appearance-none dark:text-gray-200 dark_border dark:focus:border-purple-600 w-full outline-none border border-gray-300 rounded-md focus:border-purple-600  transition-all py-2 px-3 text-gray-900 " autocomplete="off" required>
                            <option value="">Select Postion</option>
                        </select>
                        <input type="number" placeholder="Max Vote" name="max_vote" class="disabled:cursor-not-allowed dark:bg-darkBlue-secondary appearance-none dark:text-gray-200 dark_border dark:focus:border-purple-600 w-full outline-none border border-gray-300 rounded-md focus:border-purple-600  transition-all py-2 px-3 text-gray-900 " autocomplete="off" required>
                    </div>
                    <div class="chip-input-actions p-1">
                        <div class="flex flex-row gap-1 justify-center items-center h-full">
                            <a class="addchip rpl cursor-pointer dark:text-green-600 text-2xl px-2 rounded-md">
                                <i class="fad fa-check-circle"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `)
            for(let i = 0; i < chip.length; i++){
                $('select[pending]').append(`
                    <option value="${chip[i].id}">${chip[i].type}</option>
                `)
            }
            $('select[pending]').removeAttr("pending")
            $(this).parent().parent().parent().remove()
        } else {
            //if chip is not empty add the remove item to the array 
            const s = $(this).attr("data")
            const defaultchip = JSON.parse($("div[chip]").attr("chipdefault"))
            var chip = JSON.parse($("div[chip]").attr("chip"))
            for(var i = 0; i < defaultchip.length; i++){
                if(s === defaultchip[i].id){
                    chip.push(defaultchip[i])
                    $("div[chip]").attr("chip", JSON.stringify(chip))
                    $(this).parent().parent().parent().remove()
                    break
                }
            }
        }
    })
})