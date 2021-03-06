/* vim: set expandtab sw=4 ts=4 sts=4: */
/**
 * general function, usually for data manipulation pages
 *
 */

/**
 * @var sql_box_locked lock for the sqlbox textarea in the querybox/querywindow
 */
var sql_box_locked = false;

/**
 * @var array holds elements which content should only selected once
 */
var only_once_elements = new Array();

/**
 * @var   int   ajax_message_count   Number of AJAX messages shown since page load
 */
var ajax_message_count = 0;

/**
 * @var codemirror_editor object containing CodeMirror editor
 */
var codemirror_editor = false;

/**
 * @var chart_activeTimeouts object active timeouts that refresh the charts. When disabling a realtime chart, this can be used to stop the continuous ajax requests
 */
var chart_activeTimeouts = new Object();

/**
 * Returns browser's viewport size, without accounting for scrollbars
 *
 * @param window wnd
 */
function getWindowSize(wnd) {
    var vp = wnd || window;
    return {
        // most browsers || IE6-8 strict || failsafe
        width: vp.innerWidth || (vp.documentElement !== undefined ? vp.documentElement.clientWidth : false) || $(vp).width(),
        height: vp.innerHeight || (vp.documentElement !== undefined ? vp.documentElement.clientHeight : false) || $(vp).height()
    };
}

/**
 * Make sure that ajax requests will not be cached
 * by appending a random variable to their parameters
 */
$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
    var nocache = new Date().getTime() + "" + Math.floor(Math.random() * 1000000);
    if (typeof options.data == "string") {
        options.data += "&_nocache=" + nocache;
    } else if (typeof options.data == "object") {
        options.data = $.extend(originalOptions.data, {'_nocache':nocache});
    }
});

/**
 * Add a hidden field to the form to indicate that this will be an
 * Ajax request (only if this hidden field does not exist)
 *
 * @param object   the form
 */
function PMA_prepareForAjaxRequest($form)
{
    if (! $form.find('input:hidden').is('#ajax_request_hidden')) {
        $form.append('<input type="hidden" id="ajax_request_hidden" name="ajax_request" value="true" />');
    }
}

/**
 * Generate a new password and copy it to the password input areas
 *
 * @param object   the form that holds the password fields
 *
 * @return boolean  always true
 */
function suggestPassword(passwd_form)
{
    // restrict the password to just letters and numbers to avoid problems:
    // "editors and viewers regard the password as multiple words and
    // things like double click no longer work"
    var pwchars = "abcdefhjmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWYXZ";
    var passwordlength = 16;    // do we want that to be dynamic?  no, keep it simple :)
    var passwd = passwd_form.generated_pw;
    passwd.value = '';

    for ( i = 0; i < passwordlength; i++ ) {
        passwd.value += pwchars.charAt( Math.floor( Math.random() * pwchars.length ) );
    }
    passwd_form.text_pma_pw.value = passwd.value;
    passwd_form.text_pma_pw2.value = passwd.value;
    return true;
}

/**
 * Version string to integer conversion.
 */
function parseVersionString (str)
{
    if (typeof(str) != 'string') { return false; }
    var add = 0;
    // Parse possible alpha/beta/rc/
    var state = str.split('-');
    if (state.length >= 2) {
        if (state[1].substr(0, 2) == 'rc') {
            add = - 20 - parseInt(state[1].substr(2));
        } else if (state[1].substr(0, 4) == 'beta') {
            add =  - 40 - parseInt(state[1].substr(4));
        } else if (state[1].substr(0, 5) == 'alpha') {
            add =  - 60 - parseInt(state[1].substr(5));
        } else if (state[1].substr(0, 3) == 'dev') {
            /* We don't handle dev, it's git snapshot */
            add = 0;
        }
    }
    // Parse version
    var x = str.split('.');
    // Use 0 for non existing parts
    var maj = parseInt(x[0]) || 0;
    var min = parseInt(x[1]) || 0;
    var pat = parseInt(x[2]) || 0;
    var hotfix = parseInt(x[3]) || 0;
    return  maj * 100000000 + min * 1000000 + pat * 10000 + hotfix * 100 + add;
}

/**
 * Indicates current available version on main page.
 */
function PMA_current_version(data)
{
    var current = parseVersionString(pmaversion);
    var latest = parseVersionString(data['version']);
    var version_information_message = PMA_messages['strLatestAvailable'] + ' ' + escapeHtml(data['version']);
    if (latest > current) {
        var message = $.sprintf(PMA_messages['strNewerVersion'], escapeHtml(data['version']), escapeHtml(data['date']));
        if (Math.floor(latest / 10000) == Math.floor(current / 10000)) {
            /* Security update */
            klass = 'error';
        } else {
            klass = 'notice';
        }
        $('#maincontainer').after('<div class="' + klass + '">' + message + '</div>');
    }
    if (latest == current) {
        version_information_message = ' (' + PMA_messages['strUpToDate'] + ')';
    }
    $('#li_pma_version').append(version_information_message);
}

/**
 * Loads Git revision data from ajax for main.php
 */
function PMA_display_git_revision()
{
    $.get("main.php?token="
        + $("input[type=hidden][name=token]").val()
        + "&git_revision=1&ajax_request=true", function (data) {
        if (data.success == true) {
            $(data.message).insertAfter('#li_pma_version');
        }
    });
}

/**
 * for libraries/display_change_password.lib.php
 *     libraries/user_password.php
 *
 */

function displayPasswordGenerateButton()
{
    $('#tr_element_before_generate_password').parent().append('<tr class="vmiddle"><td>' + PMA_messages['strGeneratePassword'] + '</td><td><input type="button" class="button" id="button_generate_password" value="' + PMA_messages['strGenerate'] + '" onclick="suggestPassword(this.form)" /><input type="text" name="generated_pw" id="generated_pw" /></td></tr>');
    $('#div_element_before_generate_password').parent().append('<div class="item"><label for="button_generate_password">' + PMA_messages['strGeneratePassword'] + ':</label><span class="options"><input type="button" class="button" id="button_generate_password" value="' + PMA_messages['strGenerate'] + '" onclick="suggestPassword(this.form)" /></span><input type="text" name="generated_pw" id="generated_pw" /></div>');
}

/*
 * Adds a date/time picker to an element
 *
 * @param object  $this_element   a jQuery object pointing to the element
 */
function PMA_addDatepicker($this_element, options)
{
    var showTimeOption = false;
    if ($this_element.is('.datetimefield')) {
        showTimeOption = true;
    }

    var defaultOptions = {
        showOn: 'button',
        buttonImage: themeCalendarImage, // defined in js/messages.php
        buttonImageOnly: true,
        stepMinutes: 1,
        stepHours: 1,
        showSecond: true,
        showTimepicker: showTimeOption,
        showButtonPanel: false,
        dateFormat: 'yy-mm-dd', // yy means year with four digits
        timeFormat: 'hh:mm:ss',
        altFieldTimeOnly: false,
        showAnim: '',
        beforeShow: function(input, inst) {
            // Remember that we came from the datepicker; this is used
            // in tbl_change.js by verificationsAfterFieldChange()
            $this_element.data('comes_from', 'datepicker');

            // Fix wrong timepicker z-index, doesn't work without timeout
            setTimeout(function() {
                $('#ui-timepicker-div').css('z-index',$('#ui-datepicker-div').css('z-index'));
            }, 0);
        },
        onClose: function(dateText, dp_inst) {
            // The value is no more from the date picker
            $this_element.data('comes_from', '');
        }
    };

    $this_element.datetimepicker($.extend(defaultOptions, options));
}

/**
 * selects the content of a given object, f.e. a textarea
 *
 * @param object  element     element of which the content will be selected
 * @param var     lock        variable which holds the lock for this element
 *                              or true, if no lock exists
 * @param boolean only_once   if true this is only done once
 *                              f.e. only on first focus
 */
function selectContent( element, lock, only_once )
{
    if ( only_once && only_once_elements[element.name] ) {
        return;
    }

    only_once_elements[element.name] = true;

    if ( lock  ) {
        return;
    }

    element.select();
}

/**
 * Displays a confirmation box before submitting a "DROP/DELETE/ALTER" query.
 * This function is called while clicking links
 *
 * @param object   the link
 * @param object   the sql query to submit
 *
 * @return boolean  whether to run the query or not
 */
function confirmLink(theLink, theSqlQuery)
{
    // Confirmation is not required in the configuration file
    // or browser is Opera (crappy js implementation)
    if (PMA_messages['strDoYouReally'] == '' || typeof(window.opera) != 'undefined') {
        return true;
    }

    var is_confirmed = confirm($.sprintf(PMA_messages['strDoYouReally'], theSqlQuery));
    if (is_confirmed) {
        if ( $(theLink).hasClass('formLinkSubmit') ) {
            var name = 'is_js_confirmed';
            if ($(theLink).attr('href').indexOf('usesubform') != -1) {
                name = 'subform[' + $(theLink).attr('href').substr('#').match(/usesubform\[(\d+)\]/i)[1] + '][is_js_confirmed]';
            }

            $(theLink).parents('form').append('<input type="hidden" name="' + name + '" value="1" />');
        } else if ( typeof(theLink.href) != 'undefined' ) {
            theLink.href += '&is_js_confirmed=1';
        } else if ( typeof(theLink.form) != 'undefined' ) {
            theLink.form.action += '?is_js_confirmed=1';
        }
    }

    return is_confirmed;
} // end of the 'confirmLink()' function

/**
 * Displays an error message if a "DROP DATABASE" statement is submitted
 * while it isn't allowed, else confirms a "DROP/DELETE/ALTER" query before
 * sumitting it if required.
 * This function is called by the 'checkSqlQuery()' js function.
 *
 * @param object   the form
 * @param object   the sql query textarea
 *
 * @return boolean  whether to run the query or not
 *
 * @see     checkSqlQuery()
 */
function confirmQuery(theForm1, sqlQuery1)
{
    // Confirmation is not required in the configuration file
    if (PMA_messages['strDoYouReally'] == '') {
        return true;
    }

    // "DROP DATABASE" statement isn't allowed
    if (PMA_messages['strNoDropDatabases'] != '') {
        var drop_re = new RegExp('(^|;)\\s*DROP\\s+(IF EXISTS\\s+)?DATABASE\\s', 'i');
        if (drop_re.test(sqlQuery1.value)) {
            alert(PMA_messages['strNoDropDatabases']);
            theForm1.reset();
            sqlQuery1.focus();
            return false;
        } // end if
    } // end if

    // Confirms a "DROP/DELETE/ALTER/TRUNCATE" statement
    //
    // TODO: find a way (if possible) to use the parser-analyser
    // for this kind of verification
    // For now, I just added a ^ to check for the statement at
    // beginning of expression

    var do_confirm_re_0 = new RegExp('^\\s*DROP\\s+(IF EXISTS\\s+)?(TABLE|DATABASE|PROCEDURE)\\s', 'i');
    var do_confirm_re_1 = new RegExp('^\\s*ALTER\\s+TABLE\\s+((`[^`]+`)|([A-Za-z0-9_$]+))\\s+DROP\\s', 'i');
    var do_confirm_re_2 = new RegExp('^\\s*DELETE\\s+FROM\\s', 'i');
    var do_confirm_re_3 = new RegExp('^\\s*TRUNCATE\\s', 'i');

    if (do_confirm_re_0.test(sqlQuery1.value)
        || do_confirm_re_1.test(sqlQuery1.value)
        || do_confirm_re_2.test(sqlQuery1.value)
        || do_confirm_re_3.test(sqlQuery1.value)) {
        var message      = (sqlQuery1.value.length > 100)
                         ? sqlQuery1.value.substr(0, 100) + '\n    ...'
                         : sqlQuery1.value;
        var is_confirmed = confirm($.sprintf(PMA_messages['strDoYouReally'], message));
        // statement is confirmed -> update the
        // "is_js_confirmed" form field so the confirm test won't be
        // run on the server side and allows to submit the form
        if (is_confirmed) {
            theForm1.elements['is_js_confirmed'].value = 1;
            return true;
        }
        // statement is rejected -> do not submit the form
        else {
            window.focus();
            sqlQuery1.focus();
            return false;
        } // end if (handle confirm box result)
    } // end if (display confirm box)

    return true;
} // end of the 'confirmQuery()' function

/**
 * Displays an error message if the user submitted the sql query form with no
 * sql query, else checks for "DROP/DELETE/ALTER" statements
 *
 * @param object   the form
 *
 * @return boolean  always false
 *
 * @see     confirmQuery()
 */
function checkSqlQuery(theForm)
{

    // First check if codemirror is active.
    if (codemirror_editor) {
        theForm.elements['sql_query'].value = codemirror_editor.getValue();
    }

    var sqlQuery = theForm.elements['sql_query'];

    var isEmpty  = 1;

    var space_re = new RegExp('\\s+');
    if (typeof(theForm.elements['sql_file']) != 'undefined' &&
            theForm.elements['sql_file'].value.replace(space_re, '') != '') {
        return true;
    }
    if (typeof(theForm.elements['sql_localfile']) != 'undefined' &&
            theForm.elements['sql_localfile'].value.replace(space_re, '') != '') {
        return true;
    }
    if (isEmpty && typeof(theForm.elements['id_bookmark']) != 'undefined' &&
            (theForm.elements['id_bookmark'].value != null || theForm.elements['id_bookmark'].value != '') &&
            theForm.elements['id_bookmark'].selectedIndex != 0
            ) {
        return true;
    }
    // Checks for "DROP/DELETE/ALTER" statements
    if (sqlQuery.value.replace(space_re, '') != '') {
        if (confirmQuery(theForm, sqlQuery)) {
            return true;
        } else {
            return false;
        }
    }
    theForm.reset();
    isEmpty = 1;

    if (isEmpty) {
        sqlQuery.select();
        alert(PMA_messages['strFormEmpty']);
        sqlQuery.focus();
        return false;
    }

    return true;
} // end of the 'checkSqlQuery()' function

/**
 * Check if a form's element is empty.
 * An element containing only spaces is also considered empty
 *
 * @param object   the form
 * @param string   the name of the form field to put the focus on
 *
 * @return boolean  whether the form field is empty or not
 */
function emptyCheckTheField(theForm, theFieldName)
{
    var theField = theForm.elements[theFieldName];
    var space_re = new RegExp('\\s+');
    return (theField.value.replace(space_re, '') == '') ? 1 : 0;
} // end of the 'emptyCheckTheField()' function


/**
 * Check whether a form field is empty or not
 *
 * @param object   the form
 * @param string   the name of the form field to put the focus on
 *
 * @return boolean  whether the form field is empty or not
 */
function emptyFormElements(theForm, theFieldName)
{
    var theField = theForm.elements[theFieldName];
    var isEmpty = emptyCheckTheField(theForm, theFieldName);


    return isEmpty;
} // end of the 'emptyFormElements()' function


/**
 * Ensures a value submitted in a form is numeric and is in a range
 *
 * @param object   the form
 * @param string   the name of the form field to check
 * @param integer  the minimum authorized value
 * @param integer  the maximum authorized value
 *
 * @return boolean  whether a valid number has been submitted or not
 */
function checkFormElementInRange(theForm, theFieldName, message, min, max)
{
    var theField         = theForm.elements[theFieldName];
    var val              = parseInt(theField.value);

    if (typeof(min) == 'undefined') {
        min = 0;
    }
    if (typeof(max) == 'undefined') {
        max = Number.MAX_VALUE;
    }

    // It's not a number
    if (isNaN(val)) {
        theField.select();
        alert(PMA_messages['strNotNumber']);
        theField.focus();
        return false;
    }
    // It's a number but it is not between min and max
    else if (val < min || val > max) {
        theField.select();
        alert(message.replace('%d', val));
        theField.focus();
        return false;
    }
    // It's a valid number
    else {
        theField.value = val;
    }
    return true;

} // end of the 'checkFormElementInRange()' function


function checkTableEditForm(theForm, fieldsCnt)
{
    // TODO: avoid sending a message if user just wants to add a line
    // on the form but has not completed at least one field name

    var atLeastOneField = 0;
    var i, elm, elm2, elm3, val, id;

    for (i=0; i<fieldsCnt; i++)
    {
        id = "#field_" + i + "_2";
        elm = $(id);
        val = elm.val();
        if (val == 'VARCHAR' || val == 'CHAR' || val == 'BIT' || val == 'VARBINARY' || val == 'BINARY') {
            elm2 = $("#field_" + i + "_3");
            val = parseInt(elm2.val());
            elm3 = $("#field_" + i + "_1");
            if (isNaN(val) && elm3.val() != "") {
                elm2.select();
                alert(PMA_messages['strNotNumber']);
                elm2.focus();
                return false;
            }
        }

        if (atLeastOneField == 0) {
            id = "field_" + i + "_1";
            if (!emptyCheckTheField(theForm, id)) {
                atLeastOneField = 1;
            }
        }
    }
    if (atLeastOneField == 0) {
        var theField = theForm.elements["field_0_1"];
        alert(PMA_messages['strFormEmpty']);
        theField.focus();
        return false;
    }

    // at least this section is under jQuery
    if ($("input.textfield[name='table']").val() == "") {
        alert(PMA_messages['strFormEmpty']);
        $("input.textfield[name='table']").focus();
        return false;
    }


    return true;
} // enf of the 'checkTableEditForm()' function

$(function() {
    /**
     * Row marking in horizontal mode (use "live" so that it works also for
     * next pages reached via AJAX); a tr may have the class noclick to remove
     * this behavior.
     */
    $('table:not(.noclick) tr.odd:not(.noclick), table:not(.noclick) tr.even:not(.noclick)').live('click', function(e) {
        // do not trigger when clicked on anchor
        if ($(e.target).is('a, img, a *')) {
            return;
        }
        var $tr = $(this);

        // make the table unselectable (to prevent default highlighting when shift+click)
        //$tr.parents('table').noSelect();

        if (!e.shiftKey || last_clicked_row == -1) {
            // usual click

            // XXX: FF fires two click events for <label> (label and checkbox), so we need to handle this differently
            var $checkbox = $tr.find(':checkbox');
            if ($checkbox.length) {
                // checkbox in a row, add or remove class depending on checkbox state
                var checked = $checkbox.prop('checked');
                if (!$(e.target).is(':checkbox, label')) {
                    checked = !checked;
                    $checkbox.prop('checked', checked).trigger('change');
                }
                if (checked) {
                    $tr.addClass('marked');
                } else {
                    $tr.removeClass('marked');
                }
                last_click_checked = checked;
            } else {
                // normaln data table, just toggle class
                $tr.toggleClass('marked');
                last_click_checked = false;
            }

            // remember the last clicked row
            last_clicked_row = last_click_checked ? $('tr.odd:not(.noclick), tr.even:not(.noclick)').index(this) : -1;
            last_shift_clicked_row = -1;
        } else {
            // handle the shift click
            PMA_clearSelection();
            var start, end;

            // clear last shift click result
            if (last_shift_clicked_row >= 0) {
                if (last_shift_clicked_row >= last_clicked_row) {
                    start = last_clicked_row;
                    end = last_shift_clicked_row;
                } else {
                    start = last_shift_clicked_row;
                    end = last_clicked_row;
                }
                $tr.parent().find('tr.odd:not(.noclick), tr.even:not(.noclick)')
                    .slice(start, end + 1)
                    .removeClass('marked')
                    .find(':checkbox')
                    .prop('checked', false)
                    .trigger('change');
            }

            // handle new shift click
            var curr_row = $('tr.odd:not(.noclick), tr.even:not(.noclick)').index(this);
            if (curr_row >= last_clicked_row) {
                start = last_clicked_row;
                end = curr_row;
            } else {
                start = curr_row;
                end = last_clicked_row;
            }
            $tr.parent().find('tr.odd:not(.noclick), tr.even:not(.noclick)')
                .slice(start, end + 1)
                .addClass('marked')
                .find(':checkbox')
                .prop('checked', true)
                .trigger('change');

            // remember the last shift clicked row
            last_shift_clicked_row = curr_row;
        }
    });

    addDateTimePicker();

    /**
     * Add attribute to text boxes for iOS devices (based on bugID: 3508912)
     */
    if (navigator.userAgent.match(/(iphone|ipod|ipad)/i)) {
        $('input[type=text]').attr('autocapitalize','off').attr('autocorrect','off');
    }
});

/**
 * True if last click is to check a row.
 */
var last_click_checked = false;

/**
 * Zero-based index of last clicked row.
 * Used to handle the shift + click event in the code above.
 */
var last_clicked_row = -1;

/**
 * Zero-based index of last shift clicked row.
 */
var last_shift_clicked_row = -1;

/**
 * Row highlighting in horizontal mode (use "live"
 * so that it works also for pages reached via AJAX)
 */
/*$(function() {
    $('tr.odd, tr.even').live('hover',function(event) {
        var $tr = $(this);
        $tr.toggleClass('hover',event.type=='mouseover');
        $tr.children().toggleClass('hover',event.type=='mouseover');
    });
})*/

/**
 * This array is used to remember mark status of rows in browse mode
 */
var marked_row = new Array;

/**
 * marks all rows and selects its first checkbox inside the given element
 * the given element is usaly a table or a div containing the table or tables
 *
 * @param container    DOM element
 */
function markAllRows(container_id)
{

    $("#" + container_id).find("input:checkbox:enabled").prop('checked', true)
    .trigger("change")
    .parents("tr").addClass("marked");
    return true;
}

/**
 * marks all rows and selects its first checkbox inside the given element
 * the given element is usaly a table or a div containing the table or tables
 *
 * @param container    DOM element
 */
function unMarkAllRows(container_id)
{

    $("#" + container_id).find("input:checkbox:enabled").prop('checked', false)
    .trigger("change")
    .parents("tr").removeClass("marked");
    return true;
}

/**
 * Checks/unchecks all checkbox in given conainer (f.e. a form, fieldset or div)
 *
 * @param string   container_id  the container id
 * @param boolean  state         new value for checkbox (true or false)
 * @return boolean  always true
 */
function setCheckboxes(container_id, state)
{

    $("#" + container_id).find("input:checkbox").prop('checked', state);
    return true;
} // end of the 'setCheckboxes()' function

/**
  * Checks/unchecks all options of a <select> element
  *
  * @param string   the form name
  * @param string   the element name
  * @param boolean  whether to check or to uncheck options
  *
  * @return boolean  always true
  */
function setSelectOptions(the_form, the_select, do_check)
{
    $("form[name='"+ the_form +"'] select[name='"+the_select+"']").find("option").prop('selected', do_check);
    return true;
} // end of the 'setSelectOptions()' function

/**
 * Sets current value for query box.
 */
function setQuery(query)
{
    if (codemirror_editor) {
        codemirror_editor.setValue(query);
        codemirror_editor.focus();
    } else {
        document.sqlform.sql_query.value = query;
        document.sqlform.sql_query.focus();
    }
}


/**
  * Create quick sql statements.
  *
  */
function insertQuery(queryType)
{
    if (queryType == "clear") {
        setQuery('');
        return;
    }

    var query = "";
    var myListBox = document.sqlform.dummy;
    var table = document.sqlform.table.value;

    if (myListBox.options.length > 0) {
        sql_box_locked = true;
        var chaineAj = "";
        var valDis = "";
        var editDis = "";
        var NbSelect = 0;
        for (var i=0; i < myListBox.options.length; i++) {
            NbSelect++;
            if (NbSelect > 1) {
                chaineAj += ", ";
                valDis += ",";
                editDis += ",";
            }
            chaineAj += myListBox.options[i].value;
            valDis += "[value-" + NbSelect + "]";
            editDis += myListBox.options[i].value + "=[value-" + NbSelect + "]";
        }
        if (queryType == "selectall") {
            query = "SELECT * FROM `" + table + "` WHERE 1";
        } else if (queryType == "select") {
            query = "SELECT " + chaineAj + " FROM `" + table + "` WHERE 1";
        } else if (queryType == "insert") {
               query = "INSERT INTO `" + table + "`(" + chaineAj + ") VALUES (" + valDis + ")";
        } else if (queryType == "update") {
            query = "UPDATE `" + table + "` SET " + editDis + " WHERE 1";
        } else if (queryType == "delete") {
            query = "DELETE FROM `" + table + "` WHERE 1";
        }
        setQuery(query);
        sql_box_locked = false;
    }
}


/**
  * Inserts multiple fields.
  *
  */
function insertValueQuery()
{
    var myQuery = document.sqlform.sql_query;
    var myListBox = document.sqlform.dummy;

    if (myListBox.options.length > 0) {
        sql_box_locked = true;
        var chaineAj = "";
        var NbSelect = 0;
        for(var i=0; i<myListBox.options.length; i++) {
            if (myListBox.options[i].selected) {
                NbSelect++;
                if (NbSelect > 1) {
                    chaineAj += ", ";
                }
                chaineAj += myListBox.options[i].value;
            }
        }

        /* CodeMirror support */
        if (codemirror_editor) {
            codemirror_editor.replaceSelection(chaineAj);
        //IE support
        } else if (document.selection) {
            myQuery.focus();
            sel = document.selection.createRange();
            sel.text = chaineAj;
            document.sqlform.insert.focus();
        }
        //MOZILLA/NETSCAPE support
        else if (document.sqlform.sql_query.selectionStart || document.sqlform.sql_query.selectionStart == "0") {
            var startPos = document.sqlform.sql_query.selectionStart;
            var endPos = document.sqlform.sql_query.selectionEnd;
            var chaineSql = document.sqlform.sql_query.value;

            myQuery.value = chaineSql.substring(0, startPos) + chaineAj + chaineSql.substring(endPos, chaineSql.length);
        } else {
            myQuery.value += chaineAj;
        }
        sql_box_locked = false;
    }
}

/**
 * Add a date/time picker to each element that needs it
 * (only when timepicker.js is loaded)
 */
function addDateTimePicker() {
    if ($.timepicker != undefined) {
        $('input.datefield, input.datetimefield').each(function() {
            PMA_addDatepicker($(this));
        });
    }
}

/**
  * Refresh the WYSIWYG scratchboard after changes have been made
  */
function refreshDragOption(e)
{
    var $elm = $('#' + e);
    if ($elm.css('visibility') == 'visible') {
        refreshLayout();
        TableDragInit();
    }
}

/**
  * Refresh/resize the WYSIWYG scratchboard
  */
function refreshLayout()
{
    var $elm = $('#pdflayout');
    var orientation = $('#orientation_opt').val();
    if ($('#paper_opt').length==1) {
        var paper = $('#paper_opt').val();
    }else{
        var paper = 'A4';
    }
    if (orientation == 'P') {
        posa = 'x';
        posb = 'y';
    } else {
        posa = 'y';
        posb = 'x';
    }
    $elm.css('width', pdfPaperSize(paper, posa) + 'px');
    $elm.css('height', pdfPaperSize(paper, posb) + 'px');
}

/**
  * Show/hide the WYSIWYG scratchboard
  */
function ToggleDragDrop(e)
{
    var $elm = $('#' + e);
    if ($elm.css('visibility') == 'hidden') {
        PDFinit(); /* Defined in pdf_pages.php */
        $elm.css('visibility', 'visible');
        $elm.css('display', 'block');
        $('#showwysiwyg').val('1');
    } else {
        $elm.css('visibility', 'hidden');
        $elm.css('display', 'none');
        $('#showwysiwyg').val('0');
    }
}

/**
  * PDF scratchboard: When a position is entered manually, update
  * the fields inside the scratchboard.
  */
function dragPlace(no, axis, value)
{
    var $elm = $('#table_' + no);
    if (axis == 'x') {
        $elm.css('left', value + 'px');
    } else {
        $elm.css('top', value + 'px');
    }
}

/**
 * Returns paper sizes for a given format
 */
function pdfPaperSize(format, axis)
{
    switch (format.toUpperCase()) {
        case '4A0':
            if (axis == 'x') {
                return 4767.87;
            } else {
                return 6740.79;
            }
            break;
        case '2A0':
            if (axis == 'x') {
                return 3370.39;
            } else {
                return 4767.87;
            }
            break;
        case 'A0':
            if (axis == 'x') {
                return 2383.94;
            } else {
                return 3370.39;
            }
            break;
        case 'A1':
            if (axis == 'x') {
                return 1683.78;
            } else {
                return 2383.94;
            }
            break;
        case 'A2':
            if (axis == 'x') {
                return 1190.55;
            } else {
                return 1683.78;
            }
            break;
        case 'A3':
            if (axis == 'x') {
                return 841.89;
            } else {
                return 1190.55;
            }
            break;
        case 'A4':
            if (axis == 'x') {
                return 595.28;
            } else {
                return 841.89;
            }
            break;
        case 'A5':
            if (axis == 'x') {
                return 419.53;
            } else {
                return 595.28;
            }
            break;
        case 'A6':
            if (axis == 'x') {
                return 297.64;
            } else {
                return 419.53;
            }
            break;
        case 'A7':
            if (axis == 'x') {
                return 209.76;
            } else {
                return 297.64;
            }
            break;
        case 'A8':
            if (axis == 'x') {
                return 147.40;
            } else {
                return 209.76;
            }
            break;
        case 'A9':
            if (axis == 'x') {
                return 104.88;
            } else {
                return 147.40;
            }
            break;
        case 'A10':
            if (axis == 'x') {
                return 73.70;
            } else {
                return 104.88;
            }
            break;
        case 'B0':
            if (axis == 'x') {
                return 2834.65;
            } else {
                return 4008.19;
            }
            break;
        case 'B1':
            if (axis == 'x') {
                return 2004.09;
            } else {
                return 2834.65;
            }
            break;
        case 'B2':
            if (axis == 'x') {
                return 1417.32;
            } else {
                return 2004.09;
            }
            break;
        case 'B3':
            if (axis == 'x') {
                return 1000.63;
            } else {
                return 1417.32;
            }
            break;
        case 'B4':
            if (axis == 'x') {
                return 708.66;
            } else {
                return 1000.63;
            }
            break;
        case 'B5':
            if (axis == 'x') {
                return 498.90;
            } else {
                return 708.66;
            }
            break;
        case 'B6':
            if (axis == 'x') {
                return 354.33;
            } else {
                return 498.90;
            }
            break;
        case 'B7':
            if (axis == 'x') {
                return 249.45;
            } else {
                return 354.33;
            }
            break;
        case 'B8':
            if (axis == 'x') {
                return 175.75;
            } else {
                return 249.45;
            }
            break;
        case 'B9':
            if (axis == 'x') {
                return 124.72;
            } else {
                return 175.75;
            }
            break;
        case 'B10':
            if (axis == 'x') {
                return 87.87;
            } else {
                return 124.72;
            }
            break;
        case 'C0':
            if (axis == 'x') {
                return 2599.37;
            } else {
                return 3676.54;
            }
            break;
        case 'C1':
            if (axis == 'x') {
                return 1836.85;
            } else {
                return 2599.37;
            }
            break;
        case 'C2':
            if (axis == 'x') {
                return 1298.27;
            } else {
                return 1836.85;
            }
            break;
        case 'C3':
            if (axis == 'x') {
                return 918.43;
            } else {
                return 1298.27;
            }
            break;
        case 'C4':
            if (axis == 'x') {
                return 649.13;
            } else {
                return 918.43;
            }
            break;
        case 'C5':
            if (axis == 'x') {
                return 459.21;
            } else {
                return 649.13;
            }
            break;
        case 'C6':
            if (axis == 'x') {
                return 323.15;
            } else {
                return 459.21;
            }
            break;
        case 'C7':
            if (axis == 'x') {
                return 229.61;
            } else {
                return 323.15;
            }
            break;
        case 'C8':
            if (axis == 'x') {
                return 161.57;
            } else {
                return 229.61;
            }
            break;
        case 'C9':
            if (axis == 'x') {
                return 113.39;
            } else {
                return 161.57;
            }
            break;
        case 'C10':
            if (axis == 'x') {
                return 79.37;
            } else {
                return 113.39;
            }
            break;
        case 'RA0':
            if (axis == 'x') {
                return 2437.80;
            } else {
                return 3458.27;
            }
            break;
        case 'RA1':
            if (axis == 'x') {
                return 1729.13;
            } else {
                return 2437.80;
            }
            break;
        case 'RA2':
            if (axis == 'x') {
                return 1218.90;
            } else {
                return 1729.13;
            }
            break;
        case 'RA3':
            if (axis == 'x') {
                return 864.57;
            } else {
                return 1218.90;
            }
            break;
        case 'RA4':
            if (axis == 'x') {
                return 609.45;
            } else {
                return 864.57;
            }
            break;
        case 'SRA0':
            if (axis == 'x') {
                return 2551.18;
            } else {
                return 3628.35;
            }
            break;
        case 'SRA1':
            if (axis == 'x') {
                return 1814.17;
            } else {
                return 2551.18;
            }
            break;
        case 'SRA2':
            if (axis == 'x') {
                return 1275.59;
            } else {
                return 1814.17;
            }
            break;
        case 'SRA3':
            if (axis == 'x') {
                return 907.09;
            } else {
                return 1275.59;
            }
            break;
        case 'SRA4':
            if (axis == 'x') {
                return 637.80;
            } else {
                return 907.09;
            }
            break;
        case 'LETTER':
            if (axis == 'x') {
                return 612.00;
            } else {
                return 792.00;
            }
            break;
        case 'LEGAL':
            if (axis == 'x') {
                return 612.00;
            } else {
                return 1008.00;
            }
            break;
        case 'EXECUTIVE':
            if (axis == 'x') {
                return 521.86;
            } else {
                return 756.00;
            }
            break;
        case 'FOLIO':
            if (axis == 'x') {
                return 612.00;
            } else {
                return 936.00;
            }
            break;
    } // end switch

    return 0;
}

/**
 * Jquery Coding for inline editing SQL_QUERY
 */
$(function() {
    $("a.inline_edit_sql").live('click', function() {
        if ($('#sql_query_edit').length) {
            // An inline query editor is already open,
            // we don't want another copy of it
            return false;
        }

        var $form = $(this).prev();
        var sql_query  = $form.find("input[name='sql_query']").val();
        var $inner_sql = $(this).parent().prev().find('.inner_sql');
        var old_text   = $inner_sql.html();

        var new_content = "<textarea name=\"sql_query_edit\" id=\"sql_query_edit\">" + sql_query + "</textarea>\n";
        new_content    += "<input type=\"submit\" class=\"button btnSave\" value=\"" + PMA_messages['strGo'] + "\">\n";
        new_content    += "<input type=\"button\" class=\"button btnDiscard\" value=\"" + PMA_messages['strCancel'] + "\">\n";
        $inner_sql.replaceWith(new_content);

        // These settings are duplicated from the .ready()function in functions.js
        var height = $('#sql_query_edit').css('height');
        if (typeof CodeMirror !== 'undefined') {
            codemirror_editor = CodeMirror.fromTextArea($('textarea[name="sql_query_edit"]')[0], {
                lineNumbers: true,
                matchBrackets: true,
                indentUnit: 4,
                mode: "text/x-mysql",
                lineWrapping: true
            });
            codemirror_editor.getScrollerElement().style.height = height;
            codemirror_editor.refresh();
        }

        $("input.btnSave").click(function() {
            if (codemirror_editor) {
                var sql_query = codemirror_editor.getValue();
            } else {
                var sql_query = $(this).prev().val();
            }
            var $fake_form = $('<form>', {action: 'import.php', method: 'post'})
                    .append($form.find("input[name=server], input[name=db], input[name=table], input[name=token]").clone())
                    .append($('<input>', {type: 'hidden', name: 'show_query', value: 1}))
                    .append($('<input>', {type: 'hidden', name: 'sql_query', value: sql_query}));
            $fake_form.appendTo($('body')).submit();
        });
        $("input.btnDiscard").click(function() {
            $(this).closest(".sql").html("<span class=\"syntax\"><span class=\"inner_sql\">" + old_text + "</span></span>");
        });
        return false;
    });

    $('input.sqlbutton').click(function(evt) {
        insertQuery(evt.target.id);
        return false;
    });

    $("#export_type").change(function() {
        if ($("#export_type").val()=='svg') {
            $("#show_grid_opt").prop("disabled",true);
            $("#orientation_opt").prop("disabled",true);
            $("#with_doc").prop("disabled",true);
            $("#show_table_dim_opt").removeProp("disabled");
            $("#all_tables_same_width").removeProp("disabled");
            $("#paper_opt").removeProp("disabled");
            $("#show_color_opt").removeProp("disabled");
            //$(this).css("background-color","yellow");
        } else if ($("#export_type").val()=='dia') {
            $("#show_grid_opt").prop("disabled",true);
            $("#with_doc").prop("disabled",true);
            $("#show_table_dim_opt").prop("disabled",true);
            $("#all_tables_same_width").prop("disabled",true);
            $("#paper_opt").removeProp("disabled");
            $("#show_color_opt").removeProp("disabled");
            $("#orientation_opt").removeProp("disabled");
        } else if ($("#export_type").val()=='eps') {
            $("#show_grid_opt").prop("disabled",true);
            $("#orientation_opt").removeProp("disabled");
            $("#with_doc").prop("disabled",true);
            $("#show_table_dim_opt").prop("disabled",true);
            $("#all_tables_same_width").prop("disabled",true);
            $("#paper_opt").prop("disabled",true);
            $("#show_color_opt").prop("disabled",true);
        } else if ($("#export_type").val()=='pdf') {
            $("#show_grid_opt").removeProp("disabled");
            $("#orientation_opt").removeProp("disabled");
            $("#with_doc").removeProp("disabled");
            $("#show_table_dim_opt").removeProp("disabled");
            $("#all_tables_same_width").removeProp("disabled");
            $("#paper_opt").removeProp("disabled");
            $("#show_color_opt").removeProp("disabled");
        } else {
            // nothing
        }
    });

    $('#sqlquery').focus().keydown(function (e) {
        if (e.ctrlKey && e.keyCode == 13) {
            $("#sqlqueryform").submit();
        }
    });

    if ($('#input_username')) {
        if ($('#input_username').val() == '') {
            $('#input_username').focus();
        } else {
            $('#input_password').focus();
        }
    }
});

/**
 * Show a message on the top of the page for an Ajax request
 *
 * Sample usage:
 *
 * 1) var $msg = PMA_ajaxShowMessage();
 * This will show a message that reads "Loading...". Such a message will not
 * disappear automatically and cannot be dismissed by the user. To remove this
 * message either the PMA_ajaxRemoveMessage($msg) function must be called or
 * another message must be show with PMA_ajaxShowMessage() function.
 *
 * 2) var $msg = PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
 * This is a special case. The behaviour is same as above,
 * just with a different message
 *
 * 3) var $msg = PMA_ajaxShowMessage('The operation was successful');
 * This will show a message that will disappear automatically and it can also
 * be dismissed by the user.
 *
 * 4) var $msg = PMA_ajaxShowMessage('Some error', false);
 * This will show a message that will not disappear automatically, but it
 * can be dismissed by the user after he has finished reading it.
 *
 * @param string  message     string containing the message to be shown.
 *                              optional, defaults to 'Loading...'
 * @param mixed   timeout     number of milliseconds for the message to be visible
 *                              optional, defaults to 5000. If set to 'false', the
 *                              notification will never disappear
 * @return jQuery object       jQuery Element that holds the message div
 *                              this object can be passed to PMA_ajaxRemoveMessage()
 *                              to remove the notification
 */
function PMA_ajaxShowMessage(message, timeout)
{
    /**
     * @var self_closing Whether the notification will automatically disappear
     */
    var self_closing = true;
    /**
     * @var dismissable Whether the user will be able to remove
     *                  the notification by clicking on it
     */
    var dismissable = true;
    // Handle the case when a empty data.message is passed.
    // We don't want the empty message
    if (message == '') {
        return true;
    } else if (! message) {
        // If the message is undefined, show the default
        message = PMA_messages['strLoading'];
        dismissable = false;
        self_closing = false;
    } else if (message == PMA_messages['strProcessingRequest']) {
        // This is another case where the message should not disappear
        dismissable = false;
        self_closing = false;
    }
    // Figure out whether (or after how long) to remove the notification
    if (timeout == undefined) {
        timeout = 5000;
    } else if (timeout === false) {
        self_closing = false;
    }
    // Create a parent element for the AJAX messages, if necessary
    if ($('#loading_parent').length == 0) {
        $('<div id="loading_parent"></div>')
        .prependTo("body");
    }
    // Update message count to create distinct message elements every time
    ajax_message_count++;
    // Remove all old messages, if any
    $("span.ajax_notification[id^=ajax_message_num]").remove();
    /**
     * @var    $retval    a jQuery object containing the reference
     *                    to the created AJAX message
     */
    var $retval = $(
            '<span class="ajax_notification" id="ajax_message_num_'
            + ajax_message_count +
            '"></span>'
    )
    .hide()
    .appendTo("#loading_parent")
    .html(message)
    .fadeIn('medium');
    // If the notification is self-closing we should create a callback to remove it
    if (self_closing) {
        $retval
        .delay(timeout)
        .fadeOut('medium', function() {
            if ($(this).is('.dismissable')) {
                // Here we should destroy the qtip instance, but
                // due to a bug in qtip's implementation we can
                // only hide it without throwing JS errors.
                $(this).qtip('hide');
            }
            // Remove the notification
            $(this).remove();
        });
    }
    // If the notification is dismissable we need to add the relevant class to it
    // and add a tooltip so that the users know that it can be removed
    if (dismissable) {
        $retval.addClass('dismissable').css('cursor', 'pointer');
        /**
         * @var qOpts Options for "Dismiss notification" tooltip
         */
        var qOpts = {
            show: {
                effect: { length: 0 },
                delay: 0
            },
            hide: {
                effect: { length: 0 },
                delay: 0
            }
        };
        /**
         * Add a tooltip to the notification to let the user know that (s)he
         * can dismiss the ajax notification by clicking on it.
         */
        PMA_createqTip($retval, PMA_messages['strDismiss'], qOpts);
    }

    return $retval;
}

/**
 * Removes the message shown for an Ajax operation when it's completed
 *
 * @param jQuery object   jQuery Element that holds the notification
 *
 * @return nothing
 */
function PMA_ajaxRemoveMessage($this_msgbox)
{
    if ($this_msgbox != undefined && $this_msgbox instanceof jQuery) {
        $this_msgbox
        .stop(true, true)
        .fadeOut('medium');
        if ($this_msgbox.is('.dismissable')) {
            if ($('#no_hint').length < 0) {
                // Here we should destroy the qtip instance, but
                // due to a bug in qtip's implementation we can
                // only hide it without throwing JS errors.
                $this_msgbox.qtip('hide');
            }
        } else {
            $this_msgbox.remove();
        }
    }
}

$(function() {
    /**
     * Allows the user to dismiss a notification
     * created with PMA_ajaxShowMessage()
     */
    $('span.ajax_notification.dismissable').live('click', function () {
        PMA_ajaxRemoveMessage($(this));
    });
    /**
     * The below two functions hide the "Dismiss notification" tooltip when a user
     * is hovering a link or button that is inside an ajax message
     */
    $('span.ajax_notification a, span.ajax_notification button, span.ajax_notification input')
    .live('mouseover', function () {
        $(this).parents('span.ajax_notification').qtip('hide');
    });
    $('span.ajax_notification a, span.ajax_notification button, span.ajax_notification input')
    .live('mouseout', function () {
        $(this).parents('span.ajax_notification').qtip('show');
    });
});

/**
 * Hides/shows the "Open in ENUM/SET editor" message, depending on the data type of the column currently selected
 */
function PMA_showNoticeForEnum(selectElement)
{
    var enum_notice_id = selectElement.attr("id").split("_")[1];
    enum_notice_id += "_" + (parseInt(selectElement.attr("id").split("_")[2]) + 1);
    var selectedType = selectElement.val();
    if (selectedType == "ENUM" || selectedType == "SET") {
        $("p#enum_notice_" + enum_notice_id).show();
    } else {
        $("p#enum_notice_" + enum_notice_id).hide();
    }
}

/**
 * Generates a dialog box to pop up the create_table form
 */
function PMA_createTableDialog( $div, url , target)
{
     /**
      * @var    button_options  Object that stores the options passed to jQueryUI
      *                          dialog
      */
     var button_options = {};
     // in the following function we need to use $(this)
     button_options[PMA_messages['strCancel']] = function() {
         $(this).closest('.ui-dialog-content').dialog('close');
     };

     var button_options_error = {};
     button_options_error[PMA_messages['strOK']] = function() {
         $(this).closest('.ui-dialog-content').dialog('close');
     };

     // allow create-table form only once
     if ($('#create_table_form').length) {
        $('#create_table_form input[autofocus]').focus();
        return;
     }

     var $msgbox = PMA_ajaxShowMessage();

     $.get(target, url, function(data) {
      //in the case of an error, show the error message returned.
         if (data.success != undefined && data.success == false) {
             $div
             .append(data.error)
             .dialog({
                 height: 230,
                 width: 900,
                 open: PMA_verifyColumnsProperties,
                 close: function() {
                     $(this).remove();
                 },
                 buttons : button_options_error
             })// end dialog options
             //remove the redundant [Back] link in the error message.
             .find('fieldset').remove();
         } else {
             var size = getWindowSize();
             var timeout;
             $div
             .append(data.message)
             .dialog({
                 dialogClass: 'create-table',
                 resizable: false,
                 draggable: false,
                 modal: true,
                 stack: false,
                 position: ['left','top'],
                 width: size.width-10,
                 height: size.height-10,
                 open: function() {
                     var dialog_id = $(this).attr('id');
                     $(window).bind('resize.dialog-resizer', function() {
                         clearTimeout(timeout);
                         timeout = setTimeout(function() {
                             var size = getWindowSize();
                             $('#'+dialog_id).dialog('option', {
                                 width: size.width-10,
                                 height: size.height-10
                             });
                         }, 50);
                     });

                     var $wrapper = $('<div>', {'id': 'content-hide'}).hide();
                     $('body > *:not(.ui-dialog)').wrapAll($wrapper);

                     $(this)
                         .scrollTop(0) // for Chrome
                         .closest('div.ui-dialog').css({
                             left: 0,
                             top: 0
                         });

                     PMA_verifyColumnsProperties();

                     // move the Cancel button next to the Save button
                     var $button_pane = $('div.ui-dialog-buttonpane');
                     var $cancel_button = $button_pane.find('.ui-button');
                     var $save_button  = $('#create_table_form').find("input[name='do_save_data']");
                     $cancel_button.insertAfter($save_button);
                     $button_pane.hide();

                     // focus table name input
                     $(this).find("input[autofocus]").focus();
                 },
                 close: function() {
                     $(window).unbind('resize.dialog-resizer');
                     $('#content-hide > *').unwrap();
                     // resize topmenu
                     menuResize();
                     menuResize(); // somehow need to call it twice to work
                     $(this).remove();
                 },
                 buttons: button_options
             }); // end dialog options
         }
        PMA_showHints($div);
        PMA_ajaxRemoveMessage($msgbox);
     }); // end $.get()

}

/*
 * Creates a Profiling Chart with jqplot. Used in sql.js
 * and in server_status_monitor.js
 */
function PMA_createProfilingChartJqplot(target, data)
{
    return $.jqplot(target, [data],
        {
            seriesDefaults: {
                renderer: $.jqplot.PieRenderer,
                rendererOptions: {
                    showDataLabels:  true
                }
            },
            legend: {
                show: true,
                location: 'e'
            },
            // from http://tango.freedesktop.org/Tango_Icon_Theme_Guidelines#Color_Palette
            seriesColors: [
             '#fce94f',
             '#fcaf3e',
             '#e9b96e',
             '#8ae234',
             '#729fcf',
             '#ad7fa8',
             '#ef2929',
             '#eeeeec',
             '#888a85',
             '#c4a000',
             '#ce5c00',
             '#8f5902',
             '#4e9a06',
             '#204a87',
             '#5c3566',
             '#a40000',
             '#babdb6',
             '#2e3436'
            ]
        }
    );
}

/**
 * Formats a profiling duration nicely (in us and ms time). Used in server_status.js
 *
 * @param  integer    Number to be formatted, should be in the range of microsecond to second
 * @param  integer    Accuracy, how many numbers right to the comma should be
 * @return string     The formatted number
 */
function PMA_prettyProfilingNum(num, acc)
{
    if (!acc) {
        acc = 2;
    }
    acc = Math.pow(10, acc);
    if (num * 1000 < 0.1) {
        num = Math.round(acc * (num * 1000 * 1000)) / acc + 'µ';
    } else if (num < 0.1) {
        num = Math.round(acc * (num * 1000)) / acc + 'm';
    } else {
        num = Math.round(acc * num) / acc;
    }

    return num + 's';
}


/**
 * Formats a SQL Query nicely with newlines and indentation. Depends on Codemirror and MySQL Mode!
 *
 * @param string      Query to be formatted
 * @return string      The formatted query
 */
function PMA_SQLPrettyPrint(string)
{
    if (typeof CodeMirror == 'undefined') {
        return string;
    }

    var mode = CodeMirror.getMode({},"text/x-mysql");
    var stream = new CodeMirror.StringStream(string);
    var state = mode.startState();
    var token, tokens = [];
    var output = '';
    var tabs = function(cnt) {
        var ret = '';
        for (var i=0; i<4*cnt; i++) {
            ret += " ";
        }
        return ret;
    };

    // "root-level" statements
    var statements = {
        'select': ['select', 'from','on','where','having','limit','order by','group by'],
        'update': ['update', 'set','where'],
        'insert into': ['insert into', 'values']
    };
    // don't put spaces before these tokens
    var spaceExceptionsBefore = { ';':true, ',': true, '.': true, '(': true };
    // don't put spaces after these tokens
    var spaceExceptionsAfter = { '.': true };

    // Populate tokens array
    var str='';
    while (! stream.eol()) {
        stream.start = stream.pos;
        token = mode.token(stream, state);
        if (token != null) {
            tokens.push([token, stream.current().toLowerCase()]);
        }
    }

    var currentStatement = tokens[0][1];

    if (! statements[currentStatement]) {
        return string;
    }
    // Holds all currently opened code blocks (statement, function or generic)
    var blockStack = [];
    // Holds the type of block from last iteration (the current is in blockStack[0])
    var previousBlock;
    // If a new code block is found, newBlock contains its type for one iteration and vice versa for endBlock
    var newBlock, endBlock;
    // How much to indent in the current line
    var indentLevel = 0;
    // Holds the "root-level" statements
    var statementPart, lastStatementPart = statements[currentStatement][0];

    blockStack.unshift('statement');

    // Iterate through every token and format accordingly
    for (var i = 0; i < tokens.length; i++) {
        previousBlock = blockStack[0];

        // New block => push to stack
        if (tokens[i][1] == '(') {
            if (i < tokens.length - 1 && tokens[i+1][0] == 'statement-verb') {
                blockStack.unshift(newBlock = 'statement');
            } else if (i > 0 && tokens[i-1][0] == 'builtin') {
                blockStack.unshift(newBlock = 'function');
            } else {
                blockStack.unshift(newBlock = 'generic');
            }
        } else {
            newBlock = null;
        }

        // Block end => pop from stack
        if (tokens[i][1] == ')') {
            endBlock = blockStack[0];
            blockStack.shift();
        } else {
            endBlock = null;
        }

        // A subquery is starting
        if (i > 0 && newBlock == 'statement') {
            indentLevel++;
            output += "\n" + tabs(indentLevel) + tokens[i][1] + ' ' + tokens[i+1][1].toUpperCase() + "\n" + tabs(indentLevel + 1);
            currentStatement = tokens[i+1][1];
            i++;
            continue;
        }

        // A subquery is ending
        if (endBlock == 'statement' && indentLevel > 0) {
            output += "\n" + tabs(indentLevel);
            indentLevel--;
        }

        // One less indentation for statement parts (from, where, order by, etc.) and a newline
        statementPart = statements[currentStatement].indexOf(tokens[i][1]);
        if (statementPart != -1) {
            if (i > 0) {
                output += "\n";
            }
            output += tabs(indentLevel) + tokens[i][1].toUpperCase();
            output += "\n" + tabs(indentLevel + 1);
            lastStatementPart = tokens[i][1];
        }
        // Normal indentatin and spaces for everything else
        else {
            if (! spaceExceptionsBefore[tokens[i][1]]
               && ! (i > 0 && spaceExceptionsAfter[tokens[i-1][1]])
               && output.charAt(output.length -1) != ' ' ) {
                    output += " ";
            }
            if (tokens[i][0] == 'keyword') {
                output += tokens[i][1].toUpperCase();
            } else {
                output += tokens[i][1];
            }
        }

        // split columns in select and 'update set' clauses, but only inside statements blocks
        if (( lastStatementPart == 'select' || lastStatementPart == 'where'  || lastStatementPart == 'set')
            && tokens[i][1]==',' && blockStack[0] == 'statement') {

            output += "\n" + tabs(indentLevel + 1);
        }

        // split conditions in where clauses, but only inside statements blocks
        if (lastStatementPart == 'where'
            && (tokens[i][1]=='and' || tokens[i][1]=='or' || tokens[i][1]=='xor')) {

            if (blockStack[0] == 'statement') {
                output += "\n" + tabs(indentLevel + 1);
            }
            // Todo: Also split and or blocks in newlines & identation++
            //if (blockStack[0] == 'generic')
             //   output += ...
        }
    }
    return output;
}

/**
 * jQuery function that uses jQueryUI's dialogs to confirm with user. Does not
 *  return a jQuery object yet and hence cannot be chained
 *
 * @param string      question
 * @param string      url         URL to be passed to the callbackFn to make
 *                                  an Ajax call to
 * @param function    callbackFn  callback to execute after user clicks on OK
 */

jQuery.fn.PMA_confirm = function(question, url, callbackFn) {
    if (PMA_messages['strDoYouReally'] == '') {
        return true;
    }

    /**
     * @var    button_options  Object that stores the options passed to jQueryUI
     *                          dialog
     */
    var button_options = {};
    button_options[PMA_messages['strOK']] = function() {
        $(this).dialog("close");

        if ($.isFunction(callbackFn)) {
            callbackFn.call(this, url);
        }
    };
    button_options[PMA_messages['strCancel']] = function() {
        $(this).dialog("close");
    };

    $('<div/>', {'id':'confirm_dialog'})
    .prepend(question)
    .dialog({
        buttons: button_options,
        close: function () {
            $(this).remove();
        },
        modal: true
    });
};

/**
 * jQuery function to sort a table's body after a new row has been appended to it.
 * Also fixes the even/odd classes of the table rows at the end.
 *
 * @param string      text_selector   string to select the sortKey's text
 *
 * @return jQuery Object for chaining purposes
 */
jQuery.fn.PMA_sort_table = function(text_selector) {
    return this.each(function() {

        /**
         * @var table_body  Object referring to the table's <tbody> element
         */
        var table_body = $(this);
        /**
         * @var rows    Object referring to the collection of rows in {@link table_body}
         */
        var rows = $(this).find('tr').get();

        //get the text of the field that we will sort by
        $.each(rows, function(index, row) {
            row.sortKey = $.trim($(row).find(text_selector).text().toLowerCase());
        });

        //get the sorted order
        rows.sort(function(a, b) {
            if (a.sortKey < b.sortKey) {
                return -1;
            }
            if (a.sortKey > b.sortKey) {
                return 1;
            }
            return 0;
        });

        //pull out each row from the table and then append it according to it's order
        $.each(rows, function(index, row) {
            $(table_body).append(row);
            row.sortKey = null;
        });

        //Re-check the classes of each row
        $(this).find('tr:odd')
        .removeClass('even').addClass('odd')
        .end()
        .find('tr:even')
        .removeClass('odd').addClass('even');
    });
};

/**
 * jQuery coding for 'Create Table'.  Used on db_operations.php,
 * db_structure.php and db_tracking.php (i.e., wherever
 * libraries/display_create_table.lib.php is used)
 *
 * Attach Ajax Event handlers for Create Table
 */
$(function() {

     /**
     * Attach event handler to the submit action of the create table minimal form
     * and retrieve the full table form and display it in a dialog
     */
    $("#create_table_form_minimal.ajax").live('submit', function(event) {
        event.preventDefault();
        $form = $(this);
        PMA_prepareForAjaxRequest($form);

        /*variables which stores the common attributes*/
        var url = $form.serialize();
        var action = $form.attr('action');
        var $div =  $('<div id="create_table_dialog"></div>');

        /*Calling to the createTableDialog function*/
        PMA_createTableDialog($div, url, action);

        // empty table name and number of columns from the minimal form
        $form.find('input[name=table],input[name=num_fields]').val('');
    });

    /**
     * Attach event handler for submission of create table form (save)
     *
     *
     */
    // .live() must be called after a selector, see http://api.jquery.com/live
    $("#create_table_form input[name=do_save_data]").live('click', function(event) {
        event.preventDefault();

        /**
         * @var    the_form    object referring to the create table form
         */
        var $form = $("#create_table_form");

        /*
         * First validate the form; if there is a problem, avoid submitting it
         *
         * checkTableEditForm() needs a pure element and not a jQuery object,
         * this is why we pass $form[0] as a parameter (the jQuery object
         * is actually an array of DOM elements)
         */

        if (checkTableEditForm($form[0], $form.find('input[name=orig_num_fields]').val())) {
            // OK, form passed validation step
            if ($form.hasClass('ajax')) {
                PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
                PMA_prepareForAjaxRequest($form);
                //User wants to submit the form
                $.post($form.attr('action'), $form.serialize() + "&do_save_data=" + $(this).val(), function(data) {
                    if (data.success == true) {
                        $('#properties_message')
                         .removeClass('error')
                         .html('');
                        PMA_ajaxShowMessage(data.message);
                        // Only if the create table dialog (distinct panel) exists
                        if ($("#create_table_dialog").length > 0) {
                            $("#create_table_dialog").dialog("close").remove();
                        }

                        /**
                         * @var tables_table    Object referring to the <tbody> element that holds the list of tables
                         */
                        var tables_table = $("#tablesForm").find("tbody").not("#tbl_summary_row");
                        // this is the first table created in this db
                        if (tables_table.length == 0) {
                            if (window.parent && window.parent.frame_content) {
                                window.parent.frame_content.location.reload();
                            }
                        } else {
                            /**
                             * @var curr_last_row   Object referring to the last <tr> element in {@link tables_table}
                             */
                            var curr_last_row = $(tables_table).find('tr:last');
                            /**
                             * @var curr_last_row_index_string   String containing the index of {@link curr_last_row}
                             */
                            var curr_last_row_index_string = $(curr_last_row).find('input:checkbox').attr('id').match(/\d+/)[0];
                            /**
                             * @var curr_last_row_index Index of {@link curr_last_row}
                             */
                            var curr_last_row_index = parseFloat(curr_last_row_index_string);
                            /**
                             * @var new_last_row_index   Index of the new row to be appended to {@link tables_table}
                             */
                            var new_last_row_index = curr_last_row_index + 1;
                            /**
                             * @var new_last_row_id String containing the id of the row to be appended to {@link tables_table}
                             */
                            var new_last_row_id = 'checkbox_tbl_' + new_last_row_index;

                            data.new_table_string = data.new_table_string.replace(/checkbox_tbl_/, new_last_row_id);
                            //append to table
                            $(data.new_table_string)
                             .appendTo(tables_table);

                            //Sort the table
                            $(tables_table).PMA_sort_table('th');

                            // Adjust summary row
                            PMA_adjustTotals();
                        }

                        //Refresh navigation frame as a new table has been added
                        if (window.parent && window.parent.frame_navigation) {
                            window.parent.frame_navigation.location.reload();
                        }
                    } else {
                        $('#properties_message')
                         .addClass('error')
                         .html(data.error);
                        // scroll to the div containing the error message
                        $('#properties_message')[0].scrollIntoView();
                    }
                }); // end $.post()
            } // end if ($form.hasClass('ajax')
            else {
                // non-Ajax submit
                $form.append('<input type="hidden" name="do_save_data" value="save" />');
                $form.submit();
            }
        } // end if (checkTableEditForm() )
    }); // end create table form (save)

    /**
     * Attach event handler for create table form (add fields)
     *
     *
     */
    // .live() must be called after a selector, see http://api.jquery.com/live
    $("#create_table_form.ajax input[name=submit_num_fields]").live('click', function(event) {
        event.preventDefault();

        /**
         * @var    the_form    object referring to the create table form
         */
        var $form = $("#create_table_form");

        var $msgbox = PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
        PMA_prepareForAjaxRequest($form);

        //User wants to add more fields to the table
        $.post($form.attr('action'), $form.serialize() + "&submit_num_fields=" + $(this).val(), function(data) {
            // if 'create_table_dialog' exists
            if ($("#create_table_dialog").length > 0) {
                $("#create_table_dialog").html(data.message);
            }
            // if 'create_table_div' exists
            if ($("#create_table_div").length > 0) {
                $("#create_table_div").html(data.message);
            }
            PMA_verifyColumnsProperties();
            PMA_ajaxRemoveMessage($msgbox);
        }); //end $.post()

    }); // end create table form (add fields)

}, 'top.frame_content'); //end $(document).ready for 'Create Table'

/**
 * jQuery coding for 'Table operations'.  Used on tbl_operations.php
 * Attach Ajax Event handlers for Table operations
 */
$(function() {
    /**
     *Ajax action for submitting the "Alter table order by"
    **/
    $("#alterTableOrderby.ajax").live('submit', function(event) {
        event.preventDefault();
        var $form = $(this);

        PMA_prepareForAjaxRequest($form);
        /*variables which stores the common attributes*/
        $.post($form.attr('action'), $form.serialize()+"&submitorderby=Go", function(data) {
            if ($("#sqlqueryresults").length != 0) {
                $("#sqlqueryresults").remove();
            }
            if ($("#result_query").length != 0) {
                $("#result_query").remove();
            }
            if (data.success == true) {
                PMA_ajaxShowMessage(data.message);
                $("<div id='sqlqueryresults'></div>").insertAfter("#floating_menubar");
                $("#sqlqueryresults").html(data.sql_query);
                $("#result_query .notice").remove();
                $("#result_query").prepend(data.message);
            } else {
                var $temp_div = $("<div id='temp_div'></div>");
                $temp_div.html(data.error);
                var $error = $temp_div.find("code").addClass("error");
                PMA_ajaxShowMessage($error, false);
            }
        }); // end $.post()
    });//end of alterTableOrderby ajax submit

    /**
     *Ajax action for submitting the "Copy table"
    **/
    $("#copyTable.ajax input[name='submit_copy']").live('click', function(event) {
        event.preventDefault();
        var $form = $("#copyTable");
        if ($form.find("input[name='switch_to_new']").prop('checked')) {
            $form.append('<input type="hidden" name="submit_copy" value="Go" />');
            $form.removeClass('ajax');
            $form.find("#ajax_request_hidden").remove();
            $form.submit();
        } else {
            PMA_prepareForAjaxRequest($form);
            /*variables which stores the common attributes*/
            $.post($form.attr('action'), $form.serialize()+"&submit_copy=Go", function(data) {
                if ($("#sqlqueryresults").length != 0) {
                    $("#sqlqueryresults").remove();
                }
                if ($("#result_query").length != 0) {
                    $("#result_query").remove();
                }
                if (data.success == true) {
                    PMA_ajaxShowMessage(data.message);
                    $("<div id='sqlqueryresults'></div>").insertAfter("#floating_menubar");
                    $("#sqlqueryresults").html(data.sql_query);
                    $("#result_query .notice").remove();
                    $("#result_query").prepend(data.message);
                    $("#copyTable").find("select[name='target_db'] option").filterByValue(data.db).prop('selected', true);

                    //Refresh navigation frame when the table is coppied
                    if (window.parent && window.parent.frame_navigation) {
                        window.parent.frame_navigation.location.reload();
                    }
                } else {
                    PMA_ajaxShowMessage(data.error, false);
                }
            }); // end $.post()
        }
    });//end of copyTable ajax submit

    /**
     *Ajax events for actions in the "Table maintenance"
    **/
    $("#tbl_maintenance.ajax li a.maintain_action").live('click', function(event) {
        event.preventDefault();
        var $link = $(this);
        var href = $link.attr("href");
        href = href.split('?');
        if ($("#sqlqueryresults").length != 0) {
            $("#sqlqueryresults").remove();
        }
        if ($("#result_query").length != 0) {
            $("#result_query").remove();
        }
        //variables which stores the common attributes
        $.post(href[0], href[1]+"&ajax_request=true", function(data) {
            if (data.success == true && data.sql_query != undefined) {
                PMA_ajaxShowMessage(data.message);
                $("<div id='sqlqueryresults' class='ajax'></div>").insertAfter("#floating_menubar");
                $("#sqlqueryresults").html(data.sql_query);
            } else if (data.success == true) {
                var $temp_div = $("<div id='temp_div'></div>");
                $temp_div.html(data.message);
                var $success = $temp_div.find("#result_query .success");
                PMA_ajaxShowMessage($success);
                $("<div id='sqlqueryresults' class='ajax'></div>").insertAfter("#floating_menubar");
                $("#sqlqueryresults").html(data.message);
                PMA_init_slider();
                $("#sqlqueryresults").children("fieldset").remove();
            } else {
                var $temp_div = $("<div id='temp_div'></div>");
                $temp_div.html(data.error);
                var $error = $temp_div.find("code").addClass("error");
                PMA_ajaxShowMessage($error, false);
            }
        }); // end $.post()
    });//end of table maintanance ajax click

}, 'top.frame_content'); //end $(document).ready for 'Table operations'


/**
 * Attach Ajax event handlers for Drop Database. Moved here from db_structure.js
 * as it was also required on db_create.php
 *
 * @see $cfg['AjaxEnable']
 */
$(function() {
    $("#drop_db_anchor").live('click', function(event) {
        event.preventDefault();

        //context is top.frame_content, so we need to use window.parent.db to access the db var
        /**
         * @var question    String containing the question to be asked for confirmation
         */
        var question =
            PMA_messages.strDropDatabaseStrongWarning + ' '
            + $.sprintf(PMA_messages.strDoYouReally, 'DROP DATABASE ' + escapeHtml(window.parent.db));

        $(this).PMA_confirm(question, $(this).attr('href'), function(url) {

            PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
            $.get(url, {'is_js_confirmed': '1', 'ajax_request': true}, function(data) {
                //Database deleted successfully, refresh both the frames
                window.parent.refreshNavigation();
                window.parent.refreshMain();
            }); // end $.get()
        }); // end $.PMA_confirm()
    }); //end of Drop Database Ajax action
}); // end of $() for Drop Database

/**
 * Validates the password field in a form
 *
 * @see    PMA_messages['strPasswordEmpty']
 * @see    PMA_messages['strPasswordNotSame']
 * @param  object $the_form The form to be validated
 * @return bool
 */
function PMA_checkPassword($the_form)
{
    // Did the user select 'no password'?
    if ($the_form.find('#nopass_1').is(':checked')) {
        return true;
    } else {
        var $pred = $the_form.find('#select_pred_password');
        if ($pred.length && ($pred.val() == 'none' || $pred.val() == 'keep')) {
            return true;
        }
    }

    var $password = $the_form.find('input[name=pma_pw]');
    var $password_repeat = $the_form.find('input[name=pma_pw2]');
    var alert_msg = false;

    if ($password.val() == '') {
        alert_msg = PMA_messages['strPasswordEmpty'];
    } else if ($password.val() != $password_repeat.val()) {
        alert_msg = PMA_messages['strPasswordNotSame'];
    }

    if (alert_msg) {
        alert(alert_msg);
        $password.val('');
        $password_repeat.val('');
        $password.focus();
         return false;
    }
    return true;
}

/**
 * Attach Ajax event handlers for 'Change Password' on main.php
 */
$(function() {

    /**
     * Attach Ajax event handler on the change password anchor
     * @see $cfg['AjaxEnable']
     */
    $('#change_password_anchor.ajax').live('click', function(event) {
        event.preventDefault();

        var $msgbox = PMA_ajaxShowMessage();

        /**
         * @var button_options  Object containing options to be passed to jQueryUI's dialog
         */
        var button_options = {};
        button_options[PMA_messages['strGo']] = function() {

            event.preventDefault();

            /**
             * @var $the_form    Object referring to the change password form
             */
            var $the_form = $("#change_password_form");

            if (! PMA_checkPassword($the_form)) {
                return false;
            }

            /**
             * @var this_value  String containing the value of the submit button.
             * Need to append this for the change password form on Server Privileges
             * page to work
             */
            var this_value = $(this).val();

            var $msgbox = PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
            $the_form.append('<input type="hidden" name="ajax_request" value="true" />');

            $.post($the_form.attr('action'), $the_form.serialize() + '&change_pw='+ this_value, function(data) {
                if (data.success == true) {
                    $("#floating_menubar").after(data.message);
                    $("#change_password_dialog").hide().remove();
                    $("#edit_user_dialog").dialog("close").remove();
                    PMA_ajaxRemoveMessage($msgbox);
                }
                else {
                    PMA_ajaxShowMessage(data.error, false);
                }
            }); // end $.post()
        };

        button_options[PMA_messages['strCancel']] = function() {
            $(this).dialog('close');
        };
        $.get($(this).attr('href'), {'ajax_request': true}, function(data) {
            if (data.success) {
                $('<div id="change_password_dialog"></div>')
                .dialog({
                    title: PMA_messages['strChangePassword'],
                    width: 600,
                    close: function(ev, ui) {
                        $(this).remove();
                    },
                    buttons : button_options,
                    modal: true
                })
                .append(data.message);
                // for this dialog, we remove the fieldset wrapping due to double headings
                $("fieldset#fieldset_change_password")
                .find("legend").remove().end()
                .find("table.noclick").unwrap().addClass("some-margin")
                .find("input#text_pma_pw").focus();
                displayPasswordGenerateButton();
                $('#fieldset_change_password_footer').hide();
                PMA_ajaxRemoveMessage($msgbox);
                $('#change_password_form').bind('submit', function (e) {
                    e.preventDefault();
                    $(this)
                        .closest('.ui-dialog')
                        .find('.ui-dialog-buttonpane .ui-button')
                        .first()
                        .click();
                });
            } else {
                PMA_ajaxShowMessage(data.error, false);
            }
        }); // end $.get()
    }); // end handler for change password anchor
}); // end $() for Change Password

/**
 * Toggle the hiding/showing of the "Open in ENUM/SET editor" message when
 * the page loads and when the selected data type changes
 */
$(function() {
    // is called here for normal page loads and also when opening
    // the Create table dialog
    PMA_verifyColumnsProperties();
    //
    // needs live() to work also in the Create Table dialog
    $("select.column_type").live('change', function() {
        PMA_showNoticeForEnum($(this));
    });
    $("select.default_type").live('change', function() {
        PMA_hideShowDefaultValue($(this));
    });
    $('input.allow_null').live('change', function() {
        PMA_validateDefaultValue($(this));
    });
});

function PMA_verifyColumnsProperties()
{
    $("select.column_type").each(function() {
        PMA_showNoticeForEnum($(this));
    });
    $("select.default_type").each(function() {
        PMA_hideShowDefaultValue($(this));
    });
}

/**
 * Hides/shows the default value input field, depending on the default type
 * Ticks the NULL checkbox if NULL is chosen as default value.
 */
function PMA_hideShowDefaultValue($default_type)
{
    if ($default_type.val() == 'USER_DEFINED') {
        $default_type.siblings('.default_value').show().focus();
    } else {
        $default_type.siblings('.default_value').hide();
        if ($default_type.val() == 'NULL') {
            var $null_checkbox = $default_type.closest('tr').find('.allow_null');
            $null_checkbox.prop('checked', true);
        }
    }
}

/**
 * If the column does not allow NULL values, makes sure that default is not NULL
 */
function PMA_validateDefaultValue($null_checkbox)
{
    if (! $null_checkbox.prop('checked')) {
        $default = $null_checkbox.closest('tr').find('.default_type');
        if ($default.val() == 'NULL') {
            $default.val('NONE');
        }
    }
}

/**
 * @var $enum_editor_dialog An object that points to the jQuery
 *                          dialog of the ENUM/SET editor
 */
var $enum_editor_dialog = null;
/**
 * Opens the ENUM/SET editor and controls its functions
 */
$(function() {
    $("a.open_enum_editor").live('click', function() {
        // Get the name of the column that is being edited
        var colname = $(this).closest('tr').find('input:first').val();
        // And use it to make up a title for the page
        if (colname.length < 1) {
            var title = PMA_messages['enum_newColumnVals'];
        } else {
            var title = PMA_messages['enum_columnVals'].replace(
                /%s/,
                '"' + decodeURIComponent(colname) + '"'
            );
        }
        // Get the values as a string
        var inputstring = $(this)
            .closest('td')
            .find("input")
            .val();
        // Escape html entities
        inputstring = $('<div/>')
            .text(inputstring)
            .html();
        // Parse the values, escaping quotes and
        // slashes on the fly, into an array
        var values = [];
        var in_string = false;
        var curr, next, buffer = '';
        for (var i=0; i<inputstring.length; i++) {
            curr = inputstring.charAt(i);
            next = i == inputstring.length ? '' : inputstring.charAt(i+1);
            if (! in_string && curr == "'") {
                in_string = true;
            } else if (in_string && curr == "\\" && next == "\\") {
                buffer += "&#92;";
                i++;
            } else if (in_string && next == "'" && (curr == "'" || curr == "\\")) {
                buffer += "&#39;";
                i++;
            } else if (in_string && curr == "'") {
                in_string = false;
                values.push(buffer);
                buffer = '';
            } else if (in_string) {
                 buffer += curr;
            }
        }
        if (buffer.length > 0) {
            // The leftovers in the buffer are the last value (if any)
            values.push(buffer);
        }
        var fields = '';
        // If there are no values, maybe the user is about to make a
        // new list so we add a few for him/her to get started with.
        if (values.length == 0) {
            values.push('','','','');
        }
        // Add the parsed values to the editor
        var drop_icon = PMA_getImage('b_drop.png');
        for (var i=0; i<values.length; i++) {
            fields += "<tr><td>"
                   + "<input type='text' value='" + values[i] + "'/>"
                   + "</td><td class='drop'>"
                   + drop_icon
                   + "</td></tr>";
        }
        /**
         * @var dialog HTML code for the ENUM/SET dialog
         */
        var dialog = "<div id='enum_editor'>"
                   + "<fieldset>"
                   + "<legend>" + title + "</legend>"
                   + "<p>" + PMA_getImage('s_notice.png')
                   + PMA_messages['enum_hint'] + "</p>"
                   + "<table class='values'>" + fields + "</table>"
                   + "</fieldset><fieldset class='tblFooters'>"
                   + "<table class='add'><tr><td>"
                   + "<div class='slider'></div>"
                   + "</td><td>"
                   + "<form><div><input type='submit' class='add_value' value='"
                   + PMA_messages['enum_addValue'].replace(/%d/, 1)
                   + "'/></div></form>"
                   + "</td></tr></table>"
                   + "<input type='hidden' value='" // So we know which column's data is being edited
                   + $(this).closest('td').find("input").attr("id")
                   + "' />"
                   + "</fieldset>";
                   + "</div>";
        /**
         * @var  Defines functions to be called when the buttons in
         * the buttonOptions jQuery dialog bar are pressed
         */
        var buttonOptions = {};
        buttonOptions[PMA_messages['strGo']] = function () {
            // When the submit button is clicked,
            // put the data back into the original form
            var value_array = new Array();
            $(this).find(".values input").each(function(index, elm) {
                var val = elm.value.replace(/\\/g, '\\\\').replace(/'/g, "''");
                value_array.push("'" + val + "'");
            });
            // get the Length/Values text field where this value belongs
            var values_id = $(this).find("input[type='hidden']").val();
            $("input#" + values_id).val(value_array.join(","));
            $(this).dialog("close");
        };
        buttonOptions[PMA_messages['strClose']] = function () {
            $(this).dialog("close");
        };
        // Show the dialog
        var width = parseInt(
            (parseInt($('html').css('font-size'), 10)/13)*340,
            10
        );
        if (! width) {
            width = 340;
        }
        $enum_editor_dialog = $(dialog).dialog({
            minWidth: width,
            modal: true,
            title: PMA_messages['enum_editor'],
            buttons: buttonOptions,
            open: function() {
                // Focus the "Go" button after opening the dialog
                $(this).closest('.ui-dialog').find('.ui-dialog-buttonpane button:first').focus();
            },
            close: function() {
                $(this).remove();
            }
        });
        // slider for choosing how many fields to add
        $enum_editor_dialog.find(".slider").slider({
            animate: true,
            range: "min",
            value: 1,
            min: 1,
            max: 9,
            slide: function( event, ui ) {
                $(this).closest('table').find('input[type=submit]').val(
                    PMA_messages['enum_addValue'].replace(/%d/, ui.value)
                );
            }
        });
        // Focus the slider, otherwise it looks nearly transparent
        $('a.ui-slider-handle').addClass('ui-state-focus');
        return false;
    });

    // When "add a new value" is clicked, append an empty text field
    $("input.add_value").live('click', function(e) {
        e.preventDefault();
        var num_new_rows = $enum_editor_dialog.find("div.slider").slider('value');
        while (num_new_rows--) {
            $enum_editor_dialog.find('.values')
                .append(
                    "<tr style='display: none;'><td>"
                  + "<input type='text' />"
                  + "</td><td class='drop'>"
                  + PMA_getImage('b_drop.png')
                  + "</td></tr>"
                )
                .find('tr:last')
                .show('fast');
        }
    });

    // Removes the specified row from the enum editor
    $("#enum_editor td.drop").live('click', function() {
        $(this).closest('tr').hide('fast', function () {
            $(this).remove();
        });
    });
});

/**
 * Ensures indexes names are valid according to their type and, for a primary
 * key, lock index name to 'PRIMARY'
 * @param string   form_id  Variable which parses the form name as
 *                            the input
 * @return boolean  false    if there is no index form, true else
 */
function checkIndexName(form_id)
{
    if ($("#"+form_id).length == 0) {
        return false;
    }

    // Gets the elements pointers
    var $the_idx_name = $("#input_index_name");
    var $the_idx_type = $("#select_index_type");

    // Index is a primary key
    if ($the_idx_type.find("option:selected").val() == 'PRIMARY') {
        $the_idx_name.val('PRIMARY');
        $the_idx_name.prop("disabled", true);
    }

    // Other cases
    else {
        if ($the_idx_name.val() == 'PRIMARY') {
            $the_idx_name.val("");
        }
        $the_idx_name.prop("disabled", false);
    }

    return true;
} // end of the 'checkIndexName()' function

/**
 * Function to display tooltips that were
 * generated on the PHP side by PMA_Util::showHint()
 *
 * @param object $div a div jquery object which specifies the
 *                    domain for searching for tooltips. If we
 *                    omit this parameter the function searches
 *                    in the whole body
 **/
function PMA_showHints($div)
{
    if ($div == undefined || ! $div instanceof jQuery || $div.length == 0) {
        $div = $("body");
    }
    $div.find('.pma_hint').each(function () {
        $(this).children('img').qtip({
            content: $(this).children('span').html(),
            show: { delay: 0 },
            hide: { delay: 1000 },
            style: { background: '#ffffcc' }
        });
    });
}

$(function() {
    PMA_showHints();
});

/**
 * This function handles the resizing of the content frame
 * and adjusts the top menu according to the new size of the frame
 */
function menuResize()
{
    var $cnt = $('#topmenu');
    var wmax = $cnt.innerWidth() - 5; // 5 px margin for jumping menu in Chrome
    var $submenu = $cnt.find('.submenu');
    var submenu_w = $submenu.outerWidth(true);
    var $submenu_ul = $submenu.find('ul');
    var $li = $cnt.find('> li');
    var $li2 = $submenu_ul.find('li');
    var more_shown = $li2.length > 0;

    // Calculate the total width used by all the shown tabs
    var total_len = more_shown ? submenu_w : 0;
    var l = $li.length - 1;
    for (var i = 0; i < l; i++) {
        total_len += $($li[i]).outerWidth(true);
    }

    // Now hide menu elements that don't fit into the menubar
    var hidden = false; // Whether we have hidden any tabs
    while (total_len >= wmax && --l >= 0) { // Process the tabs backwards
        hidden = true;
        var el = $($li[l]);
        var el_width = el.outerWidth(true);
        el.data('width', el_width);
        if (! more_shown) {
            total_len -= el_width;
            el.prependTo($submenu_ul);
            total_len += submenu_w;
            more_shown = true;
        } else {
            total_len -= el_width;
            el.prependTo($submenu_ul);
        }
    }

    // If we didn't hide any tabs, then there might be some space to show some
    if (! hidden) {
        // Show menu elements that do fit into the menubar
        for (var i = 0, l = $li2.length; i < l; i++) {
            total_len += $($li2[i]).data('width');
            // item fits or (it is the last item
            // and it would fit if More got removed)
            if (total_len < wmax
                || (i == $li2.length - 1 && total_len - submenu_w < wmax)
            ) {
                $($li2[i]).insertBefore($submenu);
            } else {
                break;
            }
        }
    }

    // Show/hide the "More" tab as needed
    if ($submenu_ul.find('li').length > 0) {
        $submenu.addClass('shown');
    } else {
        $submenu.removeClass('shown');
    }

    if ($cnt.find('> li').length == 1) {
        // If there is only the "More" tab left, then we need
        // to align the submenu to the left edge of the tab
        $submenu_ul.removeClass().addClass('only');
    } else {
        // Otherwise we align the submenu to the right edge of the tab
        $submenu_ul.removeClass().addClass('notonly');
    }

    if ($submenu.find('.tabactive').length) {
        $submenu.addClass('active').find('> a').removeClass('tab').addClass('tabactive');
    } else {
        $submenu.removeClass('active').find('> a').addClass('tab').removeClass('tabactive');
    }
}

$(function() {
    var topmenu = $('#topmenu');
    if (topmenu.length == 0) {
        return;
    }
    // create submenu container
    var link = $('<a />', {href: '#', 'class': 'tab'})
        .text(PMA_messages['strMore'])
        .click(function(e) {
            e.preventDefault();
        });
    var img = topmenu.find('li:first-child img');
    if (img.length) {
        $(PMA_getImage('b_more.png').toString()).prependTo(link);
    }
    var submenu = $('<li />', {'class': 'submenu'})
        .append(link)
        .append($('<ul />'))
        .mouseenter(function() {
            if ($(this).find('ul .tabactive').length == 0) {
                $(this).addClass('submenuhover').find('> a').addClass('tabactive');
            }
        })
        .mouseleave(function() {
            if ($(this).find('ul .tabactive').length == 0) {
                $(this).removeClass('submenuhover').find('> a').removeClass('tabactive');
            }
        });
    topmenu.append(submenu);

    // populate submenu and register resize event
    menuResize();
    $(window).resize(menuResize);
});

/**
 * Get the row number from the classlist (for example, row_1)
 */
function PMA_getRowNumber(classlist)
{
    return parseInt(classlist.split(/\s+row_/)[1]);
}

/**
 * Changes status of slider
 */
function PMA_set_status_label($element)
{
    var text = $element.css('display') == 'none'
        ? '+ '
        : '- ';
    $element.closest('.slide-wrapper').prev().find('span').text(text);
}

/**
 * Initializes slider effect.
 */
function PMA_init_slider()
{
    $('div.pma_auto_slider').each(function() {
        var $this = $(this);

        if ($this.hasClass('slider_init_done')) {
            return;
        }
        $this.addClass('slider_init_done');

        var $wrapper = $('<div>', {'class': 'slide-wrapper'});
        $wrapper.toggle($this.is(':visible'));
        $('<a>', {href: '#'+this.id})
            .text(this.title)
            .prepend($('<span>'))
            .insertBefore($this)
            .click(function() {
                var $wrapper = $this.closest('.slide-wrapper');
                var visible = $this.is(':visible');
                if (!visible) {
                    $wrapper.show();
                }
                $this[visible ? 'hide' : 'show']('blind', function() {
                    $wrapper.toggle(!visible);
                    PMA_set_status_label($this);
                });
                return false;
            });
        $this.wrap($wrapper);
        PMA_set_status_label($this);
    });
}

/**
 * var  toggleButton  This is a function that creates a toggle
 *                    sliding button given a jQuery reference
 *                    to the correct DOM element
 */
var toggleButton = function ($obj) {
    // In rtl mode the toggle switch is flipped horizontally
    // so we need to take that into account
    if ($('span.text_direction', $obj).text() == 'ltr') {
        var right = 'right';
    } else {
        var right = 'left';
    }
    /**
     *  var  h  Height of the button, used to scale the
     *          background image and position the layers
     */
    var h = $obj.height();
    $('img', $obj).height(h);
    $('table', $obj).css('bottom', h-1);
    /**
     *  var  on   Width of the "ON" part of the toggle switch
     *  var  off  Width of the "OFF" part of the toggle switch
     */
    var on  = $('td.toggleOn', $obj).width();
    var off = $('td.toggleOff', $obj).width();
    // Make the "ON" and "OFF" parts of the switch the same size
    // + 2 pixels to avoid overflowed
    $('td.toggleOn > div', $obj).width(Math.max(on, off) + 2);
    $('td.toggleOff > div', $obj).width(Math.max(on, off) + 2);
    /**
     *  var  w  Width of the central part of the switch
     */
    var w = parseInt(($('img', $obj).height() / 16) * 22, 10);
    // Resize the central part of the switch on the top
    // layer to match the background
    $('table td:nth-child(2) > div', $obj).width(w);
    /**
     *  var  imgw    Width of the background image
     *  var  tblw    Width of the foreground layer
     *  var  offset  By how many pixels to move the background
     *               image, so that it matches the top layer
     */
    var imgw = $('img', $obj).width();
    var tblw = $('table', $obj).width();
    var offset = parseInt(((imgw - tblw) / 2), 10);
    // Move the background to match the layout of the top layer
    $obj.find('img').css(right, offset);
    /**
     *  var  offw    Outer width of the "ON" part of the toggle switch
     *  var  btnw    Outer width of the central part of the switch
     */
    var offw = $('td.toggleOff', $obj).outerWidth();
    var btnw = $('table td:nth-child(2)', $obj).outerWidth();
    // Resize the main div so that exactly one side of
    // the switch plus the central part fit into it.
    $obj.width(offw + btnw + 2);
    /**
     *  var  move  How many pixels to move the
     *             switch by when toggling
     */
    var move = $('td.toggleOff', $obj).outerWidth();
    // If the switch is initialized to the
    // OFF state we need to move it now.
    if ($('div.container', $obj).hasClass('off')) {
        if (right == 'right') {
            $('div.container', $obj).animate({'left': '-=' + move + 'px'}, 0);
        } else {
            $('div.container', $obj).animate({'left': '+=' + move + 'px'}, 0);
        }
    }
    // Attach an 'onclick' event to the switch
    $('div.container', $obj).click(function () {
        if ($(this).hasClass('isActive')) {
            return false;
        } else {
            $(this).addClass('isActive');
        }
        var $msg = PMA_ajaxShowMessage();
        var $container = $(this);
        var callback = $('span.callback', this).text();
        // Perform the actual toggle
        if ($(this).hasClass('on')) {
            if (right == 'right') {
                var operator = '-=';
            } else {
                var operator = '+=';
            }
            var url = $(this).find('td.toggleOff > span').text();
            var removeClass = 'on';
            var addClass = 'off';
        } else {
            if (right == 'right') {
                var operator = '+=';
            } else {
                var operator = '-=';
            }
            var url = $(this).find('td.toggleOn > span').text();
            var removeClass = 'off';
            var addClass = 'on';
        }
        $.post(url, {'ajax_request': true}, function(data) {
            if (data.success == true) {
                PMA_ajaxRemoveMessage($msg);
                $container
                .removeClass(removeClass)
                .addClass(addClass)
                .animate({'left': operator + move + 'px'}, function () {
                    $container.removeClass('isActive');
                });
                eval(callback);
            } else {
                PMA_ajaxShowMessage(data.error, false);
                $container.removeClass('isActive');
            }
        });
    });
};

/**
 * Initialise all toggle buttons
 */
$(window).load(function () {
    $('div.toggleAjax').each(function () {
        $(this).show();
        toggleButton($(this));
    });
});

/**
 * Vertical pointer
 */
$(function() {
    $('.vpointer').live('hover',
        //handlerInOut
        function(e) {
            var $this_td = $(this);
            var row_num = PMA_getRowNumber($this_td.attr('class'));
            // for all td of the same vertical row, toggle hover
            $('.vpointer').filter('.row_' + row_num).toggleClass('hover');
        }
        );
}); // end of $() for vertical pointer

$(function() {
    /**
     * Vertical marker
     */
    $('.vmarker').live('click', function(e) {
        // do not trigger when clicked on anchor
        if ($(e.target).is('a, img, a *')) {
            return;
        }

        var $this_td = $(this);
        var row_num = PMA_getRowNumber($this_td.attr('class'));

        // XXX: FF fires two click events for <label> (label and checkbox), so we need to handle this differently
        var $checkbox = $('.vmarker').filter('.row_' + row_num + ':first').find(':checkbox');
        if ($checkbox.length) {
            // checkbox in a row, add or remove class depending on checkbox state
            var checked = $checkbox.prop('checked');
            if (!$(e.target).is(':checkbox, label')) {
                checked = !checked;
                $checkbox.prop('checked', checked);
            }
            // for all td of the same vertical row, toggle the marked class
            if (checked) {
                $('.vmarker').filter('.row_' + row_num).addClass('marked');
            } else {
                $('.vmarker').filter('.row_' + row_num).removeClass('marked');
            }
        } else {
            // normaln data table, just toggle class
            $('.vmarker').filter('.row_' + row_num).toggleClass('marked');
        }
    });

    /**
     * Page selector in db Structure (non-AJAX)
     */
    $('#tableslistcontainer').find('#pageselector').live('change', function() {
        $(this).parent("form").submit();
    });

    /**
     * Page selector in navi panel (non-AJAX)
     */
    $('#navidbpageselector').find('#pageselector').live('change', function() {
        $(this).parent("form").submit();
    });

    /**
     * Page selector in browse_foreigners windows (non-AJAX)
     */
    $('#body_browse_foreigners').find('#pageselector').live('change', function() {
        $(this).closest("form").submit();
    });

    /**
     * Load version information asynchronously.
     */
    if ($('li.jsversioncheck').length > 0) {
        $.getJSON('http://www.phpmyadmin.net/home_page/version.json', {}, PMA_current_version);
    }

    if (typeof is_git_revision != "undefined") {
        setTimeout(PMA_display_git_revision, 10);
    }

    /**
     * Slider effect.
     */
    PMA_init_slider();

    /**
     * Enables the text generated by PMA_Util::linkOrButton() to be clickable
     */
    $('a.formLinkSubmit').live('click', function(e) {

        if ($(this).attr('href').indexOf('=') != -1) {
            var data = $(this).attr('href').substr($(this).attr('href').indexOf('#')+1).split('=', 2);
            $(this).parents('form').append('<input type="hidden" name="' + data[0] + '" value="' + data[1] + '"/>');
        }
        $(this).parents('form').submit();
        return false;
    });

    $('#update_recent_tables').ready(function() {
        if (window.parent.frame_navigation != undefined
            && window.parent.frame_navigation.PMA_reloadRecentTable != undefined)
        {
            window.parent.frame_navigation.PMA_reloadRecentTable();
        }
    });
}); // end of $()

/**
 * Creates a message inside an object with a sliding effect
 *
 * @param msg    A string containing the text to display
 * @param $obj   a jQuery object containing the reference
 *                 to the element where to put the message
 *                 This is optional, if no element is
 *                 provided, one will be created below the
 *                 navigation links at the top of the page
 *
 * @return bool   True on success, false on failure
 */
function PMA_slidingMessage(msg, $obj)
{
    if (msg == undefined || msg.length == 0) {
        // Don't show an empty message
        return false;
    }
    if ($obj == undefined || ! $obj instanceof jQuery || $obj.length == 0) {
        // If the second argument was not supplied,
        // we might have to create a new DOM node.
        if ($('#PMA_slidingMessage').length == 0) {
            $('#floating_menubar')
            .after('<span id="PMA_slidingMessage" '
                 + 'style="display: inline-block;"></span>');
        }
        $obj = $('#PMA_slidingMessage');
    }
    if ($obj.has('div').length > 0) {
        // If there already is a message inside the
        // target object, we must get rid of it
        $obj
        .find('div')
        .first()
        .fadeOut(function () {
            $obj
            .children()
            .remove();
            $obj
            .append('<div style="display: none;">' + msg + '</div>')
            .animate({
                height: $obj.find('div').first().height()
            })
            .find('div')
            .first()
            .fadeIn();
        });
    } else {
        // Object does not already have a message
        // inside it, so we simply slide it down
        var h = $obj
                .width('100%')
                .html('<div style="display: none;">' + msg + '</div>')
                .find('div')
                .first()
                .height();
        $obj
        .find('div')
        .first()
        .css('height', 0)
        .show()
        .animate({
                height: h
            }, function() {
            // Set the height of the parent
            // to the height of the child
            $obj
            .height(
                $obj
                .find('div')
                .first()
                .height()
            );
        });
    }
    return true;
} // end PMA_slidingMessage()

/**
 * Attach Ajax event handlers for Drop Table.
 *
 * @see $cfg['AjaxEnable']
 */
$(function() {
    $("#drop_tbl_anchor").live('click', function(event) {
        event.preventDefault();

        //context is top.frame_content, so we need to use window.parent.table to access the table var
        /**
         * @var question    String containing the question to be asked for confirmation
         */
        var question =
            PMA_messages.strDropTableStrongWarning + ' '
            + $.sprintf(PMA_messages.strDoYouReally, 'DROP TABLE ' + window.parent.table);

        $(this).PMA_confirm(question, $(this).attr('href'), function(url) {

            PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
            $.get(url, {'is_js_confirmed': '1', 'ajax_request': true}, function(data) {
                //Database deleted successfully, refresh both the frames
                window.parent.refreshNavigation();
                window.parent.refreshMain();
            }); // end $.get()
        }); // end $.PMA_confirm()
    }); //end of Drop Table Ajax action
}); // end of $() for Drop Table

/**
 * Attach Ajax event handlers for Truncate Table.
 *
 * @see $cfg['AjaxEnable']
 */
$(function() {
    $("#truncate_tbl_anchor.ajax").live('click', function(event) {
        event.preventDefault();

      //context is top.frame_content, so we need to use window.parent.table to access the table var
        /**
         * @var question    String containing the question to be asked for confirmation
         */
        var question =
            PMA_messages.strTruncateTableStrongWarning + ' '
            + $.sprintf(PMA_messages.strDoYouReally, 'TRUNCATE ' + window.parent.table);

        $(this).PMA_confirm(question, $(this).attr('href'), function(url) {

            PMA_ajaxShowMessage(PMA_messages['strProcessingRequest']);
            $.get(url, {'is_js_confirmed': '1', 'ajax_request': true}, function(data) {
                if ($("#sqlqueryresults").length != 0) {
                    $("#sqlqueryresults").remove();
                }
                if ($("#result_query").length != 0) {
                    $("#result_query").remove();
                }
                if (data.success == true) {
                    PMA_ajaxShowMessage(data.message);
                    $("<div id='sqlqueryresults'></div>").insertAfter("#floating_menubar");
                    $("#sqlqueryresults").html(data.sql_query);
                } else {
                    var $temp_div = $("<div id='temp_div'></div>");
                    $temp_div.html(data.error);
                    var $error = $temp_div.find("code").addClass("error");
                    PMA_ajaxShowMessage($error, false);
                }
            }); // end $.get()
        }); // end $.PMA_confirm()
    }); //end of Truncate Table Ajax action
}); // end of $() for Truncate Table

/**
 * Attach CodeMirror2 editor to SQL edit area.
 */
$(function() {
    var elm = $('#sqlquery');
    if (elm.length > 0 && typeof CodeMirror != 'undefined') {
        codemirror_editor = CodeMirror.fromTextArea(elm[0], {
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            mode: "text/x-mysql",
            lineWrapping: true
        });
    }
});

/**
 * jQuery plugin to cancel selection in HTML code.
 */
(function ($) {
    $.fn.noSelect = function (p) { //no select plugin by Paulo P.Marinas
        var prevent = (p == null) ? true : p;
        if (prevent) {
            return this.each(function () {
                if ($.browser.msie || $.browser.safari) {
                    $(this).bind('selectstart', function () {
                        return false;
                    });
                } else if ($.browser.mozilla) {
                    $(this).css('MozUserSelect', 'none');
                    $('body').trigger('focus');
                } else if ($.browser.opera) {
                    $(this).bind('mousedown', function () {
                        return false;
                    });
                } else {
                    $(this).attr('unselectable', 'on');
                }
            });
        } else {
            return this.each(function () {
                if ($.browser.msie || $.browser.safari) {
                    $(this).unbind('selectstart');
                } else if ($.browser.mozilla) {
                    $(this).css('MozUserSelect', 'inherit');
                } else if ($.browser.opera) {
                    $(this).unbind('mousedown');
                } else {
                    $(this).removeAttr('unselectable');
                }
            });
        }
    }; //end noSelect
})(jQuery);

/**
 * jQuery plugin to correctly filter input fields by value, needed
 * because some nasty values may break selector syntax
 */
(function ($) {
    $.fn.filterByValue = function (value) {
        return this.filter(function () {
            return $(this).val() === value;
        });
    };
})(jQuery);

/**
 * Create default PMA tooltip for the element specified. The default appearance
 * can be overriden by specifying optional "options" parameter (see qTip options).
 */
function PMA_createqTip($elements, content, options)
{
    if ($('#no_hint').length > 0) {
        return;
    }

    var o = {
        content: content,
        style: {
            classes: {
                tooltip: 'normalqTip',
                content: 'normalqTipContent'
            },
            name: 'dark'
        },
        position: {
            target: 'mouse',
            corner: { target: 'rightMiddle', tooltip: 'leftMiddle' },
            adjust: { x: 10, y: 20 }
        },
        show: {
            delay: 0,
            effect: {
                type: 'grow',
                length: 150
            }
        },
        hide: {
            effect: {
                type: 'grow',
                length: 200
            }
        }
    };

    $elements.qtip($.extend(true, o, options));
}

/**
 * Return value of a cell in a table.
 */
function PMA_getCellValue(td) {
    var $td = $(td);
    if ($td.is('.null')) {
        return '';
    } else if (! $td.is('.to_be_saved') && $td.data('original_data')) {
        return $td.data('original_data');
    } else {
        return $td.text();
    }
}

/* Loads a js file, an array may be passed as well */
loadJavascript=function(file) {
    var $head = $('head');
    if ($.isArray(file)) {
        for(var i=0, l=file.length; i<l; i++) {
            $head.append('<script type="text/javascript" src="'+file[i]+'"></script>');
        }
    } else {
        $head.append('<script type="text/javascript" src="'+file+'"></script>');
    }
};

$(function() {
    /**
     * Theme selector.
     */
    $('a.themeselect').live('click', function(e) {
        window.open(
            e.target,
            'themes',
            'left=10,top=20,width=510,height=350,scrollbars=yes,status=yes,resizable=yes'
            );
        return false;
    });

    /**
     * Automatic form submission on change.
     */
    $('.autosubmit').change(function(e) {
        e.target.form.submit();
    });

    /**
     * Theme changer.
     */
    $('a.take_theme').click(function(e) {
        var what = this.name;
        if (window.opener && window.opener.document.forms['setTheme'].elements['set_theme']) {
            window.opener.document.forms['setTheme'].elements['set_theme'].value = what;
            window.opener.document.forms['setTheme'].submit();
            window.close();
            return false;
        }
        return true;
    });
});

/**
 * Clear text selection
 */
function PMA_clearSelection() {
    if (document.selection && document.selection.empty) {
        document.selection.empty();
    } else if (window.getSelection) {
        var sel = window.getSelection();
        if (sel.empty) {
            sel.empty();
        }
        if (sel.removeAllRanges) {
            sel.removeAllRanges();
        }
    }
}

/**
 * HTML escaping
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Print button
 */
function printPage()
{
    // Do print the page
    if (typeof(window.print) != 'undefined') {
        window.print();
    }
}

$(function() {
    $('input#print').click(printPage);
});

/**
 * Makes the breadcrumbs and the menu bar float at the top of the viewport
 */
$(function () {
    if ($("#floating_menubar").length && $('#PMA_disable_floating_menubar').length == 0) {
        $("#floating_menubar")
            .css({
                'position': 'fixed',
                'top': 0,
                'left': 0,
                'width': '100%',
                'z-index': 500
            })
            .append($('#serverinfo'))
            .append($('#topmenucontainer'));
        $('body').css(
            'padding-top',
            $('#floating_menubar').outerHeight(true)
        );
    }
});

/**
 * Ajaxification for the "Create View" action
 */
$(document).ready(function () {
    $('span.create_view.ajax a').live('click', function (e) {
        e.preventDefault();
        var $msg = PMA_ajaxShowMessage();
        var syntaxHighlighter = null;
        $.get($(this).attr('href') + '&ajax_request=1', function (data) {
            PMA_ajaxRemoveMessage($msg);
            var buttonOptions = {};
            buttonOptions[PMA_messages['strGo']] = function () {
                if (typeof CodeMirror !== 'undefined') {
                    syntaxHighlighter.save();
                }
                $msg = PMA_ajaxShowMessage();
                $.get('view_create.php', $('#createViewDialog').find('form').serialize(), function (data) {
                    PMA_ajaxRemoveMessage($msg);
                    if (data.success === true) {
                        $('#createViewDialog').dialog("close");
                        $('#result_query').html(data.message);
                    } else {
                        PMA_ajaxShowMessage(data.error, false);
                    }
                });
            };
            buttonOptions[PMA_messages['strClose']] = function () {
                $(this).dialog("close");
            };
            var $dialog = $('<div/>').attr('id', 'createViewDialog').append(data.message).dialog({
                width: 500,
                minWidth: 300,
                maxWidth: 620,
                modal: true,
                buttons: buttonOptions,
                title: $('legend', $(data.message)).html(),
                close: function () {
                    $(this).remove();
                }
            });
            $dialog.find('legend').remove();
            // Attach syntax highlited editor
            if (typeof CodeMirror !== 'undefined') {
                var $elm = $dialog.find('textarea');
                var opts = {lineNumbers: true, matchBrackets: true, indentUnit: 4, mode: "text/x-mysql"};
                syntaxHighlighter = CodeMirror.fromTextArea($elm[0], opts);
            }
            $('input:visible[type=text]', $dialog).first().focus();
        });
    });
    /**
     * Attach Ajax event handlers for input fields in the editor
     * and used to submit the Ajax request when the ENTER key is pressed.
     */
    $('#createViewDialog').find('input, select').live('keydown', function (e) {
        if (e.which === 13) { // 13 is the ENTER key
            e.preventDefault();
            $(this).closest('.ui-dialog').find('.ui-button:first').click();
        }
    }); // end $.live()
});

/**
 * Watches checkboxes in a form to set the checkall box accordingly
 */
var checkboxes_sel = "input.checkall:checkbox:enabled";
$(checkboxes_sel).live("change", function () {
    var $form = $(this.form);
    // total number of checkboxes in current form
    var total_boxes = $form.find(checkboxes_sel).length;
    // number of checkboxes checked in current form
    var checked_boxes = $form.find(checkboxes_sel + ":checked").length;
    var $checkall = $form.find("input#checkall");
    if (total_boxes == checked_boxes) {
        $checkall.prop({checked: true, indeterminate: false});
    }
    else if (checked_boxes > 0) {
        $checkall.prop({checked: true, indeterminate: true});
    }
    else {
        $checkall.prop({checked: false, indeterminate: false});
    }
});
$("input#checkall").live("change", function() {
    var is_checked = $(this).is(":checked");
    $(this.form).find(checkboxes_sel).prop("checked", is_checked)
    .parents("tr").toggleClass("marked", is_checked);
});

/**
 * Toggles row colors of a set of 'tr' elements starting from a given element
 *
 * @param $start Starting element
 */
function toggleRowColors($start)
{
    for (var $curr_row = $start; $curr_row.length > 0; $curr_row = $curr_row.next()) {
        if ($curr_row.hasClass('odd')) {
            $curr_row.removeClass('odd').addClass('even');
        } else if ($curr_row.hasClass('even')) {
            $curr_row.removeClass('even').addClass('odd');
        }
    }
}

/**
 * Formats a byte number to human-readable form
 *
 * @param bytes the bytes to format
 * @param optional subdecimals the number of digits after the point
 * @param optional pointchar the char to use as decimal point
 */
function formatBytes(bytes, subdecimals, pointchar) {
    if (!subdecimals) {
        var subdecimals = 0;
    }
    if (!pointchar) {
        var pointchar = '.';
    }
    var units = ['B', 'KiB', 'MiB', 'GiB'];
    for (var i = 0; bytes > 1024 && i < units.length; i++) {
        bytes /= 1024;
    }
    var factor = Math.pow(10, subdecimals);
    bytes = Math.round(bytes * factor) / factor;
    bytes = bytes.toString().split('.').join(pointchar);
    return bytes + ' ' + units[i];
}

/**
 * Opens pma more themes link in themes browser, in new window instead of popup
 * This way, we don't break HTML validity
 */
$(function () {
    $("a._blank").prop("target", "_blank");
});

/**
 * Reveal the login form to users with JS enabled
 */
$(function () {
    var $loginform = $('#loginform');
    $loginform.find('.js-show').show();
    $loginform.find('#input_username').select();
});
