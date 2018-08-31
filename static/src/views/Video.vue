<script>
export default {

    name: 'kms-video',

    props: ['srcObject'],

    render(createElement) {
        console.log(this.props);
        return createElement('video', {
            domProps: {
                srcObject: this.srcObject,
                autoplay: true,
            }
        });
    },

    created() {
        const c = document.querySelectorAll('video');
        c[0];
    }
}
</script>
