// function to create empty ingredient row (any changes can be made here and get applied everywhere)

export function getEmptyComponentRow(rowIndex){
    return `
        <td></td>
        <td colspan="7" style="background-color:#f2f2f2; font-weight:bold;">
        <input type="text" name="component_text_${rowIndex}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
        <div class="error-create-recipe" id="errorCompText_${rowIndex}"></div>
        </td>
        <td style="text-align: center">
        <div class="btn btn-sm btn-outline-danger bi bi-trash remove-component-btn" >
        </div>
    </td>
    `;
}

