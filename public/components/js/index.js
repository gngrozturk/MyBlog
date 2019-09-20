$(document).ready(function () {
    $("#delete-blog").on('click', function (e) {
        const id = $(e.target).attr('data-id');
        var r = confirm('Blog silinsin mi?')
        if (r) {
            $.ajax({
                type: 'DELETE',
                url: '/blog/' + id,
                success: function (res) {
                    window.location.href = '/'
                },
                error: function (err) {
                    console.log(err);
                }
            })
        }

    })
})