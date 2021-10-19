$(document).ready( () => {
    var positions = [], //use for storing selected positions
    defaultpos = JSON.parse($("div[chip]").attr("chip")), // default positions in array 
    posleft = JSON.parse($("div[chip]").attr("chip")) // array of not selected positions
    if($("div[chip]").length != 0){
        $("div[chip]").each( function() {
            if(JSON.parse($(this).attr("chip")).length != 0) {
                $(this).html('')
                addchip(JSON.parse($(this).attr("chip")))
            }
        })
    }
    //when add chip is clicked
    $("div[chip]").delegate(".addchip", "click", function() {
        const selected = $("div[chip]").attr("chip-selected")
        const max = $(this).parent().parent().parent().find("input[type='number']").val()
        //push the selected item to positions 
        for(let i = 0; i < defaultpos.length; i++){
            if(selected === defaultpos[i].id){
                //push the selected item to positions 
                positions.push({
                    id: selected, 
                    maxvote: max
                })
                //remove active class 
                $(this).parent().parent().parent().removeClass("chip-input-active")
                //disable inputs 
                $(this).parent().parent().parent().find("select, input[type='number']").prop("disabled", true)
                //add new icon 
                $(this).parent().html(`
                    <a data="${selected}" class="removechip rpl cursor-pointer dark:text-red-500 text-red-600 text-2xl px-2 rounded-md">
                        <i class="fad fa-times-circle"></i>
                    </a>
                `)
                break
            }
        }
        //update positions input 
        $(".e_positions").find("input[name='positions']").val(JSON.stringify(positions))
        //update posleft array 
        for(let y = 0; y < posleft.length; y++){
            if(selected === posleft[y].id){
                posleft.splice(y, 1) 
                addchip(posleft)
                break
            }
        }
    })
    //when remove chip is clicked
    $("div[chip]").delegate(".removechip", "click", function() {
        const selected = $(this).attr("data")
        //get the selected item and push to posleft 
        for(let i = 0; i < defaultpos.length; i++){
            if(selected === defaultpos[i].id){
                //push the item to posleft 
                posleft.push(defaultpos[i])
                //remove the chip-input-active
                $(this).parent().parent().parent().remove()
                $(".e_positions").find(".chip-input-active").remove()
                break
            }
        }
        //remove this item to positions 
        for(let x = 0; x < positions.length; x++){
            if(selected === positions[x].id){
                positions.splice(x, 1)
                break
            }
        }
        //update positions input 
        $(".e_positions").find("input[name='positions']").val(JSON.stringify(positions))
        //add chip 
        addchip(posleft)
    })
    function addchip(chipvalue){
        if(chipvalue.length != 0){
            $("div[chip]").append(`
                <div class="chip-input chip-input-active animate__animated animate__fadeInUp ms-500 flex flex-row gap-1">
                    <div class="activechip w-full grid grid-cols-2 gap-2 p-2">
                        <select pending class="activeselect disabled:cursor-not-allowed dark:bg-darkBlue-secondary appearance-none dark:text-gray-200 dark_border dark:focus:border-purple-600 w-full outline-none border border-gray-300 rounded-md focus:border-purple-600  transition-all py-2 px-3 text-gray-900 " autocomplete="off">
                            <option value="">Select Postion</option>
                        </select>
                        <input type="number" placeholder="Max Vote" class="disabled:cursor-not-allowed dark:bg-darkBlue-secondary appearance-none dark:text-gray-200 dark_border dark:focus:border-purple-600 w-full outline-none border border-gray-300 rounded-md focus:border-purple-600  transition-all py-2 px-3 text-gray-900 " autocomplete="off">
                    </div>
                    <div class="chip-input-actions p-1">
                        <div class="flex flex-row gap-1 justify-center items-center h-full">
                            <a class="addchip rpl cursor-pointer dark:text-green-600 text-green-700 text-2xl px-2 rounded-md">
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
})