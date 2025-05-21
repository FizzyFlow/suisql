<template>

    <div>


    </div>
  
</template>
  
<script>
  
export default {
    name: 'Site',
    path: '/site/:id',
    props: {
    },
    components: {
    },
    data() {
        return {
            siteId: null,
        }
    },
    watch: {
    },
    methods: {
    },
    computed: {
    },
    beforeMount() {
    },
    mounted() {
        this.siteId = this.$route.params.id;
    },
}

</script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
  <style>
      h6 {
          font-size: 16px;
          font-weight: bold;
          margin: 0 0 16px 0;
      }
  
      h5 {
          margin: 0 0 16px 0;
      }
  
  </style>
  
  